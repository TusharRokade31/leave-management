import { useState, useEffect } from "react";
import { Stats, LeaveFormData } from "@/type/form";
import { api } from "@/lib/api/api";

interface UseLeavesReturn {
  leaves: Leave[];
  loading: boolean;
  stats: Stats;
  fetchLeaves: () => Promise<void>;
  createLeave: (leaveData: LeaveFormData) => Promise<void>;
  updateLeaveStatus: (leaveId: number, status: 'APPROVED' | 'REJECTED', comment?: string) => Promise<void>;
  deleteLeave: (leaveId: number) => Promise<void>;
}

export const useLeaves = (currentUser: User | null): UseLeavesReturn => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0 });

  const fetchLeaves = async (): Promise<void> => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      let fetchedLeaves: Leave[];
      if (currentUser.role === 'MANAGER') {
        fetchedLeaves = await api.getAllLeaves();
      } else {
        fetchedLeaves = await api.getMyLeaves();
      }
      setLeaves(fetchedLeaves);
      
      // Fetch stats
      const fetchedStats = await api.getStats();
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      alert('Failed to fetch leaves: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [currentUser]);

  const createLeave = async (leaveData: LeaveFormData): Promise<void> => {
    try {
      await api.createLeave(leaveData);
      await fetchLeaves();
      alert('Leave request submitted successfully!');
    } catch (error) {
      console.error('Failed to create leave:', error);
      alert('Failed to create leave: ' + (error as Error).message);
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
      await fetchLeaves();
      alert(`Leave ${status.toLowerCase()} successfully!`);
    } catch (error) {
      console.error('Failed to update leave:', error);
      alert('Failed to update leave: ' + (error as Error).message);
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
      alert('Leave deleted successfully!');
    } catch (error) {
      console.error('Failed to delete leave:', error);
      alert('Failed to delete leave: ' + (error as Error).message);
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