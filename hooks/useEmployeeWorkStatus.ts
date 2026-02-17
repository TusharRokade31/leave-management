"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api/api";
import { toast } from "react-toastify";

/* ================================
   INTERFACES
================================ */

interface AssignedTask {
  company: string;
  task: string;
  isDone: boolean;
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
    comment: string,
    assignedTasks?: AssignedTask[]
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

  // ── KEY FIX: Store currentDate in a ref so callbacks always read the
  // latest value without needing it in their dependency arrays.
  // This prevents useCallback from creating new function references on
  // every render (which was causing fetchEmployeeWorkStatus to re-run
  // and reset the employees state, closing the modal).
  const currentDateRef = useRef(currentDate);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const stats = useMemo(
    () => ({
      totalEmployees: employees.length,
      pendingLeaves: employees.reduce(
        (acc, emp) =>
          acc +
          (emp.leaves?.filter((l) => l.status === "PENDING").length || 0),
        0
      ),
    }),
    [employees]
  );

  // ── Stable fetch: reads date/user from refs, never changes reference ──
  const fetchEmployeeWorkStatus = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user || user.role !== "MANAGER") return;

    setLoading(true);
    try {
      const date = currentDateRef.current;
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const data = await api.getEmployeeWorkStatus(month, year);
      setEmployees(data || []);
    } catch (error) {
      console.error("Fetch failed:", error);
      toast.error("Failed to fetch employee data");
    } finally {
      setLoading(false);
    }
  }, []); // ← empty deps: this function never gets recreated

  // ── Re-fetch when month/year actually changes ──
  const prevMonthYearRef = useRef<string>("");
  useEffect(() => {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    if (prevMonthYearRef.current !== key) {
      prevMonthYearRef.current = key;
      fetchEmployeeWorkStatus();
    }
  }, [currentDate, fetchEmployeeWorkStatus]);

  // ── Also re-fetch when user changes (e.g. login) ──
  useEffect(() => {
    fetchEmployeeWorkStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

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
        toast.success("Company saved");
        await fetchCompanies();
      } catch {
        toast.error("Failed to save company");
      }
    },
    [fetchCompanies]
  );

  /* ================================
     ASSIGN TASK
     - Updates employees state directly (surgical update) instead of
       re-fetching the entire list. This keeps the modal open because
       the employees array reference changes in a controlled way that
       the modal's useEffect can handle without unmounting.
  ================================= */
  const addAssignedTasks = useCallback(
    async (
      date: string,
      employeeId: number,
      assignedTasks: AssignedTask[]
    ): Promise<boolean> => {
      try {
        const token = getAuthToken();

        const tasksWithTimestamp = assignedTasks.map((task) => ({
          ...task,
          assignedAt: task.assignedAt || new Date().toISOString(),
        }));

        const res = await fetch("/api/tasks/assign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            date,
            employeeId,
            assignedTasks: tasksWithTimestamp,
          }),
        });

        if (res.ok) {
          // ── Surgical state update instead of full re-fetch ──
          // Only update the specific employee's specific task's assignedTasks.
          // This triggers the modal's useEffect (which watches employees)
          // to sync, without causing a loading flash or modal close.
          setEmployees((prev) =>
            prev.map((emp) => {
              if (emp.user.id !== employeeId) return emp;
              const updatedTasks = emp.tasks.map((t) => {
                const taskDate = new Date(t.date).toISOString().split("T")[0];
                if (taskDate !== date) return t;
                return { ...t, assignedTasks: tasksWithTimestamp };
              });
              // If no task exists yet for this date, we still return the
              // updated employee — the modal already has the optimistic state
              return { ...emp, tasks: updatedTasks };
            })
          );
          return true;
        }
        return false;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [] // no deps needed — uses no external state
  );

  /* ================================
     FEEDBACK
  ================================= */
  const updateTaskFeedback = useCallback(
    async (
      date: string,
      employeeId: number,
      comment: string,
      assignedTasks?: AssignedTask[]
    ): Promise<boolean> => {
      try {
        const token = getAuthToken();

        const res = await fetch("/api/tasks/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            date,
            employeeId,
            managerComment: comment,
            assignedTasks,
          }),
        });

        if (res.ok) {
          // Full re-fetch is fine here because handleCentralUpdate
          // calls onClose() immediately after — modal is already closing.
          await fetchEmployeeWorkStatus();
          return true;
        }
        return false;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [fetchEmployeeWorkStatus]
  );

  /* ================================
     USER MANAGEMENT
  ================================= */
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