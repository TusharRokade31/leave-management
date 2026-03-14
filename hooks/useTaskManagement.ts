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
 */
export const useTaskManagement = (initialEmployees: any[], currentUser: any) => {
  const [localStatuses, setLocalStatuses] = useState<Record<number, string>>({});
  
  // ⭐ THE VAULT: Keeps tasks in memory to prevent UI flicker
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
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    dedupingInterval: 10000
  });

  // ✅ Logic to extract tasks array from different API response shapes
  const getTasksFromData = useCallback((data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.tasks && Array.isArray(data.tasks)) return data.tasks;
    return [];
  }, []);

  // Keep the vault in sync with background fetches
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
      const innerTasks = record.assignedTasks || record.tasks || [];
      
      innerTasks.forEach((at: any) => {
        if (at.taskTitle || at.task) {
          taskList.push({
            ...at,
            id: at.id, // Ensure ID is mapped correctly
            company: at.company || at.companyName || "Internal",
            task: at.task || at.taskTitle || "No Content",
            status: (localStatuses[at.id] || at.status || "ASSIGNED").toUpperCase(),
            employeeName: record.user?.name || record.name || currentUser.name,
            employeeId: Number(record.userId || record.id || currentUser.id),
            date: at.assignedAt || record.date || new Date().toISOString()
          });
        }
      });
    });

    return taskList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fetchedData, currentUser, localStatuses, getTasksFromData]);

  const updateStatus = useCallback(async (assignedTaskId: number, newStatus: string, comment?: string) => {
    // 1. Find the current task to determine if the status is actually changing
    const currentTaskInList = allTasks.find(t => t.id === assignedTaskId);
    const currentStatus = currentTaskInList?.status || localStatuses[assignedTaskId] || "ASSIGNED";
    
    const isStatusChange = currentStatus.toUpperCase() !== newStatus.toUpperCase();
    const previousStatus = localStatuses[assignedTaskId];

    // Optimistic Update: Change color/column immediately
    setLocalStatuses(prev => ({ ...prev, [assignedTaskId]: newStatus }));

    try {
      const token = getAuthToken();
      const res = await fetch("/api/tasks/assign/status", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ assignedTaskId, status: newStatus, managerComment: comment || "" }),
      });

      if (!res.ok) throw new Error("Sync failed");
      
      await mutate();

      // ✅ FIXED TOAST LOGIC: Prioritize status change message over feedback message
      if (isStatusChange) {
        const cleanStatus = newStatus.replace("_", " ").toLowerCase();
        toast.success(`Task moved to ${cleanStatus}`);
      } else if (comment && comment.trim() !== "") {
        toast.success("Feedback saved successfully");
      }
      
      return true;
    } catch (error: any) {
      // Revert UI on failure
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