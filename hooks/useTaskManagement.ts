"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { getAuthToken } from "@/lib/api/api";

const fetcher = async (url: string) => {
  const token = getAuthToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
};

/**
 * useTaskManagement
 * Dedicated hook for Kanban/Task Matrix view.
 * Support for cross-employee visibility via 'view=company_pipeline'.
 */
export const useTaskManagement = (initialEmployees: any[], currentUser: any) => {
  const [localStatuses, setLocalStatuses] = useState<Record<number, string>>({});
  
  // THE VAULT: Keeps tasks in memory to prevent UI flicker during revalidation
  const taskVault = useRef<any[]>(initialEmployees || []);

  const url = useMemo(() => {
    if (!currentUser?.id) return null;
    // Both MANAGER and EMPLOYEE use company_pipeline to get all cross-employee task data
    // MANAGER: needs all employees' tasks across companies, not just their own
    // EMPLOYEE: needs teammates assigned to the same companies
    return `/api/tasks?view=company_pipeline`;
  }, [currentUser?.id]);

  const { data: fetchedData, mutate, isValidating } = useSWR(url, fetcher, {
    fallbackData: initialEmployees,
    keepPreviousData: true, 
    revalidateOnFocus: true,
    revalidateIfStale: true,
    revalidateOnMount: true,
    dedupingInterval: 5000 // Slightly reduced for better real-time feel
  });

  const getTasksFromData = useCallback((data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.tasks && Array.isArray(data.tasks)) return data.tasks;
    return [];
  }, []);

  // Update the vault whenever new data arrives
  useEffect(() => {
    const tasksArray = getTasksFromData(fetchedData);
    if (tasksArray.length > 0) {
      taskVault.current = tasksArray;
    }
  }, [fetchedData, getTasksFromData]);

  const refreshTasks = useCallback(async () => {
    if (mutate) await mutate();
  }, [mutate]);

  const allTasks = useMemo(() => {
    const taskList: any[] = [];
    const sourceData = getTasksFromData(fetchedData) || taskVault.current;
    
    if (!currentUser || !Array.isArray(sourceData)) return [];

    sourceData.forEach((record: any) => {
      /**
       * The backend response can be:
       * 1. An array of FlattenedTask objects (direct)
       * 2. An array of User objects with nested tasks
       */
      const innerTasks = record.assignedTasks || record.tasks || (record.task || record.taskTitle ? [record] : []);
      
      innerTasks.forEach((at: any) => {
        if (at.taskTitle || at.task) {
          // Determine who this specific task belongs to
          // Priority: record.user (nested object) -> record (direct props) -> at (inline props)
          const empName = record.user?.name || record.employeeName || at.employeeName || "Unknown User";
          const empId = Number(record.userId || record.employeeId || at.employeeId || record.id || 0);

          taskList.push({
            ...at,
            id: at.id,
            company: at.company || at.companyName || "Internal",
            task: at.task || at.taskTitle || "No Content",
            status: (localStatuses[at.id] || at.status || "ASSIGNED").toUpperCase(),
            employeeName: empName,
            employeeId: empId,
            date: at.assignedAt || at.createdAt || at.date || new Date().toISOString(),
            managerComment: at.managerComment || "",
            commentHistory: at.commentHistory || []
          });
        }
      });
    });

    // Sort by date descending
    return taskList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fetchedData, currentUser, localStatuses, getTasksFromData]);

  const updateStatus = useCallback(async (assignedTaskId: number, newStatus: string, comment?: string) => {
    const currentTaskInList = allTasks.find(t => t.id === assignedTaskId);
    const currentStatus = currentTaskInList?.status || localStatuses[assignedTaskId] || "ASSIGNED";
    
    const isStatusChange = currentStatus.toUpperCase() !== newStatus.toUpperCase();
    const previousStatus = localStatuses[assignedTaskId];

    // Optimistic UI Update
    setLocalStatuses(prev => ({ ...prev, [assignedTaskId]: newStatus }));

    try {
      const token = getAuthToken();
      const res = await fetch("/api/tasks/assign/status", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          assignedTaskId, 
          status: newStatus.toUpperCase(), 
          managerComment: comment || "" 
        }),
      });

      if (!res.ok) throw new Error("Sync failed");
      
      // Revalidate SWR to get fresh data from server
      await mutate();

      if (isStatusChange) {
        const cleanStatus = newStatus.replace("_", " ").toLowerCase();
        toast.success(`Task moved to ${cleanStatus}`);
      } else if (comment && comment.trim() !== "") {
        toast.success("Feedback saved successfully");
      }
      
      return true;
    } catch (error: any) {
      // Revert Optimistic UI on error
      setLocalStatuses(old => ({ ...old, [assignedTaskId]: previousStatus }));
      toast.error("Update failed. Reverting...");
      return false;
    }
  }, [localStatuses, mutate, allTasks]);

  return { 
    allTasks, 
    updateStatus, 
    refreshTasks,
    isLoading: isValidating && taskVault.current.length === 0 
  };
};