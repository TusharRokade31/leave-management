import { useState, useEffect, useCallback } from "react";
import { Stats, LeaveFormData } from "@/type/form";
import { api } from "@/lib/api/api";
import { toast } from "react-toastify";

// 1. Ensure the local interface is exactly what the UI needs
interface Leave {
  id: number;
  userId: number;
  startDate: string | Date;
  endDate: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  type: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isOptional?: boolean;      
  holidayName?: string | null; 
  managerComment?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  isEdited?: boolean;
  editSummary?: string | null;
  user?: {
    name: string | null;
  };
}

interface UseLeavesReturn {
  leaves: Leave[];
  loading: boolean;
  stats: Stats;
  fetchLeaves: () => Promise<void>;
  createLeave: (leaveData: LeaveFormData) => Promise<void>;
  updateLeaveStatus: (leaveId: number, status: 'APPROVED' | 'REJECTED', comment?: string) => Promise<void>;
  deleteLeave: (leaveId: number) => Promise<void>;
}

export const useLeaves = (currentUser: any): UseLeavesReturn => { 
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, wfh: 0 });

  // ✅ Wrap in useCallback to prevent unnecessary re-renders in useEffect
  const fetchLeaves = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // 2. We use 'any' as a bridge to resolve the red line mismatch
      let fetchedData: any; 
      
      if (currentUser.role === 'MANAGER') {
        fetchedData = await api.getAllLeaves();
      } else {
        fetchedData = await api.getMyLeaves();
      }
      
      // 3. Cast the data to our new local interface
      setLeaves(fetchedData as Leave[]);
      
      // Fetch stats
      const fetchedStats = await api.getStats();
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      toast.error('Failed to fetch leaves: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const createLeave = async (leaveData: LeaveFormData): Promise<void> => {
    try {
      await api.createLeave(leaveData);
      // ✅ Trigger refresh to get new 'days' count and updated list
      await fetchLeaves();
      toast.success('Leave request submitted successfully!');
    } catch (error) {
      console.error('Failed to create leave:', error);
      const errorMessage = (error as any).response?.data?.error || (error as Error).message;
      toast.error('Failed to create leave: ' + errorMessage);
      throw error;
    }
  };

  const updateLeaveStatus = async (
    leaveId: number, 
    status: 'APPROVED' | 'REJECTED', 
    comment?: string
  ): Promise<void> => {
    try {
      await api.updateLeaveStatus(leaveId, status, comment);
      // ✅ Refresh ensures the table shows current status and data
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