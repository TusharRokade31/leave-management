"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api/api";
import { toast } from "react-toastify";

/* ================================
    INTERFACES
================================ */

interface AssignedTask {
  id?: number;      
  userId: number;   
  companyName?: string; 
  taskTitle?: string;   
  company?: string;     
  task?: string;        
  isDone: boolean;
  dueDate?: string | null;
  createdAt?: string;
  assignedAt?: string;
}

interface Task {
  id: number;
  date: string;
  content: string;
  status: "PRESENT" | "WFH" | "ABSENT" | "LEAVE" | "HOLIDAY";
  isCompleted: boolean;
  managerComment?: string;
  assignedTasks?: AssignedTask[]; 
}

interface Employee {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    endDate?: string | null;
  };
  leaves: Leave[];
  tasks: Task[];
  assignedTasks: AssignedTask[]; 
}

interface Leave {
  id: number;
  startDate: string;
  endDate: string;
  type: "FULL" | "HALF" | "EARLY" | "LATE" | "WORK_FROM_HOME";
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
  days: number;
  managerComment?: string;
}

interface UseEmployeeWorkStatusReturn {
  employees: Employee[];
  loading: boolean;
  companies: string[];
  fetchEmployeeWorkStatus: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateTaskFeedback: (
    date: string,
    employeeId: number,
    comment: string
  ) => Promise<boolean>;
  addAssignedTasks: (
    date: string,
    employeeId: number,
    assignedTasks: AssignedTask[]
  ) => Promise<boolean>; 
  addUser: (userData: {
    name: string;
    email: string;
    role: string;
  }) => Promise<void>;
  updateUser: (
    userId: number,
    updateData: { name?: string; endDate?: string | null }
  ) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
  saveNewCompany: (name: string) => Promise<void>;
  stats: { totalEmployees: number; pendingLeaves: number };
}

/* ================================
    HELPERS
================================ */

const getAuthToken = () => {
  if (typeof document === "undefined") return null;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("authToken="))
    ?.split("=")[1];
};

/* ================================
    HOOK
================================ */

export const useEmployeeWorkStatus = (
  currentUser: any | null,
  currentDate: Date
): UseEmployeeWorkStatusReturn => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const stats = useMemo(
    () => ({
      totalEmployees: employees.length,
      pendingLeaves: employees.reduce(
        (acc, emp) =>
          acc + (emp.leaves?.filter((l) => l.status === "PENDING").length || 0),
        0
      ),
    }),
    [employees]
  );

  /**
   * ✅ FETCH LOGIC (Persistence Fix)
   * This ensures that when you refresh, tasks from the AssignedTask table
   * are correctly injected into the specific Task days.
   */
  const fetchEmployeeWorkStatus = useCallback(async () => {
    if (!currentUser || currentUser.role !== "MANAGER") return;

    setLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const data = await api.getEmployeeWorkStatus(month, year);
      
      const mergedData = data.map((emp: Employee) => {
        // Zip top-level assignedTasks into their respective daily task objects
        const nestedTasks = (emp.tasks || []).map((t) => {
          const taskDateKey = new Date(t.date).toISOString().split('T')[0];
          
          const dailyQueue = (emp.assignedTasks || [])
            .filter((at) => {
              const assignedDate = at.createdAt || at.assignedAt;
              return assignedDate && new Date(assignedDate).toISOString().split('T')[0] === taskDateKey;
            })
            .map((at) => ({
              ...at,
              company: at.company || at.companyName || "",
              task: at.task || at.taskTitle || ""
            }));

          return { ...t, assignedTasks: dailyQueue };
        });

        return { ...emp, tasks: nestedTasks };
      });

      setEmployees(mergedData || []);
    } catch (error) {
      console.error("Fetch failed:", error);
      toast.error("Failed to fetch employee data");
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentDate]);

  useEffect(() => {
    fetchEmployeeWorkStatus();
  }, [fetchEmployeeWorkStatus]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies");
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(data.map((c: any) => c.name));
    } catch {
      toast.error("Failed to load companies");
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const saveNewCompany = useCallback(
    async (name: string) => {
      try {
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error();
        
        // Update local state immediately so dropdown refreshes instantly
        setCompanies((prev) => {
          if (prev.includes(name)) return prev;
          return [...prev, name].sort();
        });
        toast.success("Company saved");
      } catch {
        toast.error("Failed to save company");
      }
    },
    []
  );

  const addAssignedTasks = useCallback(
    async (
      date: string,
      employeeId: number,
      newTasks: AssignedTask[]
    ): Promise<boolean> => {
      try {
        const token = getAuthToken();
        const res = await fetch("/api/tasks/assign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            employeeId,
            assignedTasks: newTasks,
            date 
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // The data.assignedTasks should be mapped to UI names by the backend
          const incomingTasks = (data.assignedTasks || []).map((at: any) => ({
            ...at,
            company: at.company || at.companyName || "",
            task: at.task || at.taskTitle || ""
          }));
          
          setEmployees((prev) =>
            prev.map((emp) => {
              if (emp.user.id !== employeeId) return emp;

              const updatedTasks = emp.tasks.map((t) => {
                const d1 = new Date(t.date).toISOString().split('T')[0];
                const d2 = new Date(date).toISOString().split('T')[0];
                
                if (d1 === d2) {
                  return { ...t, assignedTasks: incomingTasks };
                }
                return t;
              });

              return { 
                ...emp, 
                tasks: updatedTasks,
                assignedTasks: incomingTasks 
              };
            })
          );
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    },
    [] 
  );

  const updateTaskFeedback = useCallback(
    async (
      date: string,
      employeeId: number,
      comment: string
    ): Promise<boolean> => {
      try {
        const token = getAuthToken();
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            date,
            employeeId,
            managerComment: comment,
          }),
        });

        if (res.ok) {
          await fetchEmployeeWorkStatus();
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    },
    [fetchEmployeeWorkStatus]
  );

  const addUser = useCallback(
    async (userData: { name: string; email: string; role: string }) => {
      try {
        const res = await fetch("/api/users/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        if (!res.ok) throw new Error();
        toast.success("Employee added");
        await fetchEmployeeWorkStatus();
      } catch {
        toast.error("Add failed");
      }
    },
    [fetchEmployeeWorkStatus]
  );

  const updateUser = useCallback(
    async (
      userId: number,
      updateData: { name?: string; endDate?: string | null }
    ) => {
      try {
        const res = await fetch("/api/users/manage", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...updateData }),
        });
        if (!res.ok) throw new Error();
        toast.success("Employee updated");
        await fetchEmployeeWorkStatus();
      } catch {
        toast.error("Update failed");
      }
    },
    [fetchEmployeeWorkStatus]
  );

  const deleteUser = useCallback(
    async (userId: number) => {
      if (!confirm("Delete employee permanently?")) return;
      try {
        const res = await fetch(`/api/users/manage?userId=${userId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        toast.success("Employee deleted");
        await fetchEmployeeWorkStatus();
      } catch {
        toast.error("Delete failed");
      }
    },
    [fetchEmployeeWorkStatus]
  );

  return {
    employees,
    loading,
    companies,
    stats,
    fetchEmployeeWorkStatus,
    refreshData: fetchEmployeeWorkStatus,
    updateTaskFeedback,
    addAssignedTasks,
    addUser,
    updateUser,
    deleteUser,
    saveNewCompany,
  };
};