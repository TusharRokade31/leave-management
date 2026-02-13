"use client";
  import { useState, useEffect, useCallback } from "react";
  import { api } from "@/lib/api/api";
  import { toast } from "react-toastify";

  interface Task {
    id: number;
    date: string;
    content: string;
    status: 'PRESENT' | 'WFH' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';
    isCompleted: boolean;
    managerComment?: string;
  }

  interface Leave {
    id: number;
    startDate: string;
    endDate: string;
    type: 'FULL' | 'HALF' | 'EARLY' | 'LATE' | 'WORK_FROM_HOME';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
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
    fetchEmployeeWorkStatus: () => Promise<void>;
    refreshData: () => Promise<void>; // Added to fix red line in Home
    updateTaskFeedback: (date: string, employeeId: number, comment: string) => Promise<boolean>;
    addUser: (userData: { name: string; email: string; role: string }) => Promise<void>;
    updateUser: (userId: number, updateData: { name?: string; endDate?: string | null }) => Promise<void>;
    deleteUser: (userId: number) => Promise<void>;
  }

  export const useEmployeeWorkStatus = (
    currentUser: any | null,
    currentDate: Date
  ): UseEmployeeWorkStatusReturn => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchEmployeeWorkStatus = useCallback(async (): Promise<void> => {
      if (!currentUser || currentUser.role !== 'MANAGER') return;

      setLoading(true);
      try {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const data = await api.getEmployeeWorkStatus(month, year);
        setEmployees(data);
      } catch (error) {
        console.error('Failed to fetch employee work status:', error);
      } finally {
        setLoading(false);
      }
    }, [currentUser, currentDate]);

    const addUser = async (userData: { name: string; email: string; role: string }) => {
      try {
        const response = await fetch("/api/users/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        if (response.ok) {
          toast.success("Employee added successfully");
          await fetchEmployeeWorkStatus();
        } else {
          const err = await response.json();
          toast.error(err.error || "Failed to add employee");
        }
      } catch (error) {
        console.error("Add user error:", error);
        toast.error("Network error adding employee");
      }
    };

    const updateUser = async (userId: number, updateData: { name?: string; endDate?: string | null }) => {
      try {
        const response = await fetch("/api/users/manage", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...updateData }),
        });

        if (response.ok) {
          const updatedUserData = await response.json();
          
          setEmployees((prevEmployees) =>
            prevEmployees.map((emp) =>
              emp.user.id === userId
                ? {
                    ...emp,
                    user: updatedUserData,
                  }
                : emp
            )
          );

          toast.success("Employee details updated");
        } else {
          const err = await response.json();
          toast.error(err.error || "Failed to update employee");
        }
      } catch (error) {
        console.error("Update user error:", error);
        toast.error("Network error updating employee");
      }
    };

    const deleteUser = async (userId: number) => {
      if (!confirm("Caution: This will permanently delete the employee and all their leave/task records. Continue?")) return;
      
      try {
        const response = await fetch(`/api/users/manage?userId=${userId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success("Employee deleted successfully");
          await fetchEmployeeWorkStatus();
        } else {
          const err = await response.json();
          toast.error(err.error || "Failed to delete employee");
        }
      } catch (error) {
        console.error("Delete user error:", error);
        toast.error("Network error deleting employee");
      }
    };

    const updateTaskFeedback = async (date: string, employeeId: number, comment: string) => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${document.cookie.split('authToken=')[1]?.split(';')[0]}` 
          },
          body: JSON.stringify({
            date,
            employeeId,
            managerComment: comment,
          }),
        });

        if (response.ok) {
          await fetchEmployeeWorkStatus();
          toast.success("Feedback saved");
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to update feedback:", error);
        return false;
      }
    };

    useEffect(() => {
      fetchEmployeeWorkStatus();
    }, [fetchEmployeeWorkStatus]);

    return {
      employees,
      loading,
      fetchEmployeeWorkStatus,
      refreshData: fetchEmployeeWorkStatus, // Maps the fetch function to the alias used in Home
      updateTaskFeedback,
      addUser,
      updateUser,
      deleteUser
    };
  };