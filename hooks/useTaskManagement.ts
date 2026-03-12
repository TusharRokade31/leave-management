"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { getAuthToken } from "@/lib/api/api";

const fetcher = async (url: string) => {
  const token = getAuthToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export const useTaskManagement = (initialEmployees: any[], currentUser: any) => {
  const [localStatuses, setLocalStatuses] = useState<Record<number, string>>({});
  
  // ⭐ THE VAULT: This keeps the tasks in memory even if SWR clears itself
  const taskVault = useRef<any[]>(initialEmployees || []);

  const url = useMemo(() => {
    if (!currentUser?.id) return null;
    return currentUser.role === 'EMPLOYEE' 
      ? `/api/tasks?userId=${currentUser.id}` 
      : "/api/tasks";
  }, [currentUser?.id, currentUser?.role]);

  const { data: fetchedData, mutate, isValidating } = useSWR(url, fetcher, {
    fallbackData: initialEmployees,
    keepPreviousData: true, 
    revalidateOnFocus: true,
    revalidateIfStale: true,
    revalidateOnMount: false, // Prevents the immediate "flash" of empty data
  });

  // Update the vault whenever fresh data actually arrives
  useEffect(() => {
    if (fetchedData && Array.isArray(fetchedData) && fetchedData.length > 0) {
      taskVault.current = fetchedData;
    }
  }, [fetchedData]);

  const allTasks = useMemo(() => {
    const taskList: any[] = [];
    
    // ⭐ PROTECTION: Use the vault if fetchedData is currently null or empty
    const sourceData = (fetchedData && fetchedData.length > 0) ? fetchedData : taskVault.current;
    
    if (!currentUser || !Array.isArray(sourceData) || sourceData.length === 0) return [];

    sourceData.forEach((emp: any) => {
      const seenTaskIds = new Set<number>();
      
      // EMPLOYEE SIDE LOGIC (Maintained)
      if (emp.assignedTasks && !emp.tasks && currentUser.role === 'EMPLOYEE') {
          emp.assignedTasks.forEach((at: any) => {
              taskList.push({
                  ...at,
                  employeeName: currentUser.name,
                  employeeId: Number(currentUser.id),
                  date: at.createdAt || new Date().toISOString(),
                  status: (localStatuses[at.id] || at.status || (at.isDone ? "COMPLETED" : "ASSIGNED")).toUpperCase(),
                  managerComment: at.managerComment,
                  commentHistory: at.commentHistory || [],
                  updatedAt: at.updatedAt
              });
          });
          return;
      }

      // NESTED TASKS LOGIC (Maintained)
      emp.tasks?.forEach((day: any) => {
        day.assignedTasks?.forEach((at: any) => {
          seenTaskIds.add(at.id);
          taskList.push({
            ...at,
            employeeName: emp.user?.name || emp.name || currentUser.name,
            employeeId: Number(emp.user?.id || emp.id || currentUser.id),
            date: day.date,
            status: (localStatuses[at.id] || at.status || (at.isDone ? "COMPLETED" : "ASSIGNED")).toUpperCase(),
            updatedAt: at.updatedAt,
            managerComment: at.managerComment,
            commentHistory: at.commentHistory || []
          });
        });
      });

      // DIRECT ASSIGNMENTS LOGIC (Maintained)
      const directAssignments = emp.user?.assignedTasks || emp.assignedTasks || [];
      directAssignments.forEach((at: any) => {
        if (!seenTaskIds.has(at.id)) {
          taskList.push({
            ...at,
            employeeName: emp.user?.name || emp.name || currentUser.name,
            employeeId: Number(emp.user?.id || emp.id || currentUser.id),
            date: at.createdAt || at.assignedAt || new Date().toISOString(),
            status: (localStatuses[at.id] || at.status || (at.isDone ? "COMPLETED" : "ASSIGNED")).toUpperCase(),
            updatedAt: at.updatedAt,
            managerComment: at.managerComment,
            commentHistory: at.commentHistory || []
          });
        }
      });
    });

    return taskList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fetchedData, currentUser, localStatuses]);

  const updateStatus = useCallback(async (assignedTaskId: number, newStatus: string, comment?: string) => {
    setLocalStatuses(prev => {
      const previousStatus = prev[assignedTaskId];
      (async () => {
        try {
          const token = getAuthToken();
          const res = await fetch("/api/tasks/assign/status", {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ assignedTaskId, status: newStatus, managerComment: comment }),
          });
          if (!res.ok) throw new Error("Sync failed");
          await mutate();
          toast.success(comment ? "Feedback saved" : `Moved to ${newStatus.replace("_", " ")}`);
        } catch (error: any) {
          setLocalStatuses(old => ({ ...old, [assignedTaskId]: previousStatus }));
          toast.error("Update failed");
        }
      })();
      return { ...prev, [assignedTaskId]: newStatus };
    });
    return true;
  }, [mutate]);

  return { 
    allTasks, 
    updateStatus, 
    // Only show loading if we have NO data in SWR AND the Vault is empty
    isLoading: !fetchedData && isValidating && taskVault.current.length === 0 
  };
}; 