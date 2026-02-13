// hooks/useDashboardLeave.ts
import { useState, useEffect } from "react";
import { Stats, LeaveFormData } from "@/type/form";
import { api } from "@/lib/api/api";
import { toast } from "react-toastify";

// Define the User interface locally to match your updated auth model
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  endDate?: string | null;
}

// Define the Leave interface to ensure internal consistency
interface Leave {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  status: string;
  type: string;
  days: number;
  reason: string;
  managerComment?: string | null;
}

interface UseLeavesReturn {
  leaves: Leave[];
  loading: boolean;
  stats: Stats;
  fetchLeaves: () => Promise<void>;
  createLeave: (leaveData: LeaveFormData) => Promise<void>;
  updateLeaveStatus: (leaveId: number, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  deleteLeave: (leaveId: number) => Promise<void>;
}

export const useDashboardLeaves = (currentUser: User | null, currentDate: Date): UseLeavesReturn => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, wfh: 0 });

  const fetchLeaves = async (): Promise<void> => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      let fetchedLeaves: Leave[];
      if (currentUser.role === 'MANAGER') {
        fetchedLeaves = await api.getAllDashboardLeaves(month, year);
      } else {
        fetchedLeaves = await api.getMyLeaves();
      }
      setLeaves(fetchedLeaves);
      
      const fetchedStats = await api.getStats(month, year);
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [currentUser, currentDate]); 

  const createLeave = async (leaveData: LeaveFormData): Promise<void> => {
    try {
      await api.createLeave(leaveData);
      await fetchLeaves();
      toast.success('Leave request submitted successfully!');
    } catch (error) {
      console.error('Failed to create leave:', error);
      toast.error('Failed to create leave: ' + (error as Error).message);
      throw error;
    }
  };

  const updateLeaveStatus = async (leaveId: number, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
    try {
      await api.updateLeaveStatus(leaveId, status);
      await fetchLeaves();
      toast.success(`Leave ${status.toLowerCase()} successfully!`);
    } catch (error) {
      console.error('Failed to update leave:', error);
      toast.error('Failed to update leave: ' + (error as Error).message);
      throw error;
    }
  };

  const deleteLeave = async (leaveId: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this leave request?')) {
      return;
    }
    
    try {
      await api.deleteLeave(leaveId);
      await fetchLeaves();
      toast.success('Leave deleted successfully!');
    } catch (error) {
      console.error('Failed to delete leave:', error);
      toast.error('Failed to delete leave: ' + (error as Error).message);
      throw error;
    }
  };

  return {
    leaves,
    loading,
    stats,
    fetchLeaves,
    createLeave,
    updateLeaveStatus,
    deleteLeave
  };
};