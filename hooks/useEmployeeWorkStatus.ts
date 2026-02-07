// hooks/useEmployeeWorkStatus.ts
import { useState, useEffect } from "react";
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
}

export const useEmployeeWorkStatus = (
  currentUser: User | null,
  currentDate: Date
): UseEmployeeWorkStatusReturn => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchEmployeeWorkStatus = async (): Promise<void> => {
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
  };

  useEffect(() => {
    fetchEmployeeWorkStatus();
  }, [currentUser, currentDate]);

  return {
    employees,
    loading,
    fetchEmployeeWorkStatus,
  };
};