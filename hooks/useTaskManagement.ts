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
 * Separated from Calendar logic to ensure clean data flow for Workflow status.
 */
export const useTaskManagement = (initialEmployees: any[], currentUser: any) => {
  const [localStatuses, setLocalStatuses] = useState<Record<number, string>>({});
  
  // ⭐ THE VAULT: Keeps tasks in memory to prevent UI flicker during SWR re-validation
  const taskVault = useRef<any[]>(initialEmployees || []);

  const url = useMemo(() => {
    if (!currentUser?.id) return null;
    // We fetch from the dedicated tasks endpoint
    return currentUser.role === 'EMPLOYEE' 
      ? `/api/tasks?userId=${currentUser.id}` 
      : "/api/tasks";
  }, [currentUser?.id, currentUser?.role]);

  // ⭐ PERFORMANCE CONFIG: Optimized for Workflow UI stability
  const { data: fetchedData, mutate, isValidating } = useSWR(url, fetcher, {
    fallbackData: initialEmployees,
    keepPreviousData: true, 
    revalidateOnFocus: false, // Prevents card jump when clicking back to window
    revalidateIfStale: false,  // Use cache immediately for instant tab switching
    revalidateOnMount: true,
    dedupingInterval: 10000    // Prevents redundant API calls
  });

  // Keep the vault in sync with background fetches
  useEffect(() => {
    if (fetchedData && Array.isArray(fetchedData)) {
      taskVault.current = fetchedData;
    }
  }, [fetchedData]);

  const refreshTasks = useCallback(async () => {
    if (mutate) await mutate();
  }, [mutate]);

  const allTasks = useMemo(() => {
    const taskList: any[] = [];
    
    // sourceData: Uses fresh SWR data if available, falls back to the Vault instantly
    const sourceData = (fetchedData && Array.isArray(fetchedData)) ? fetchedData : taskVault.current;
    
    if (!currentUser || !Array.isArray(sourceData)) return [];

    sourceData.forEach((record: any) => {
      // Handle nested structure: records can be [ { tasks: [...] } ] or [ { assignedTasks: [...] } ]
      // depending on Manager vs Employee API response
      const innerTasks = record.assignedTasks || record.tasks || [];
      
      innerTasks.forEach((at: any) => {
        // Only push actual task items to the matrix
        if (at.taskTitle || at.task) {
          taskList.push({
            ...at,
            company: at.company || at.companyName || "Internal",
            task: at.task || at.taskTitle || "No Content",
            // Priority: Local UI State -> API Status -> Default
            status: (localStatuses[at.id] || at.status || "ASSIGNED").toUpperCase(),
            employeeName: record.user?.name || record.name || currentUser.name,
            employeeId: Number(record.userId || record.id || currentUser.id),
            date: at.assignedAt || record.date || new Date().toISOString()
          });
        }
      });
    });

    // Sort by most recent first for the Kanban board
    return taskList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fetchedData, currentUser, localStatuses]);

  const updateStatus = useCallback(async (assignedTaskId: number, newStatus: string, comment?: string) => {
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
        body: JSON.stringify({ assignedTaskId, status: newStatus, managerComment: comment }),
      });

      if (!res.ok) throw new Error("Sync failed");
      
      // Re-validate silently in the background
      await mutate();
      toast.success(comment ? "Feedback saved" : `Moved to ${newStatus.replace("_", " ")}`);
      return true;
    } catch (error: any) {
      // Revert UI on failure
      setLocalStatuses(old => ({ ...old, [assignedTaskId]: previousStatus }));
      toast.error("Update failed. Reverting...");
      return false;
    }
  }, [localStatuses, mutate]);

  return { 
    allTasks, 
    updateStatus, 
    refreshTasks,
    // Ensures loading state only triggers if the vault is completely empty
    isLoading: isValidating && taskVault.current.length === 0 
  };
};