// hooks/useEmployeeWorkStatus.ts
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/api";

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
  };
  leaves: Leave[];
  tasks: Task[];
}

interface UseEmployeeWorkStatusReturn {
  employees: Employee[];
  loading: boolean;
  fetchEmployeeWorkStatus: () => Promise<void>;
  updateTaskFeedback: (date: string, employeeId: number, comment: string) => Promise<boolean>;
}

export const useEmployeeWorkStatus = (
  currentUser: any | null, // Replace 'any' with your User type
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

  const updateTaskFeedback = async (date: string, employeeId: number, comment: string) => {
    try {
      // Reusing your fetch logic from the modal
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
        await fetchEmployeeWorkStatus(); // Refresh the list automatically
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
    updateTaskFeedback
  };
};