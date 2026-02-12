// api.ts
import { AuthResponse, LeaveFormData, Stats } from "@/type/form";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

const setCookie = (name: string, value: string, days: number = 1): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const getAuthToken = (): string | null => {
  return getCookie('authToken');
};

export const setAuthToken = (token: string): void => {
  setCookie('authToken', token, 1);
};

// FIX: Changed from calling itself to calling deleteCookie
export const removeAuthToken = (): void => {
  deleteCookie('authToken');
};

const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const api = {
  // Auth APIs
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    return response.json();
  },

  register: async (name: string, email: string, password: string, role: string): Promise<AuthResponse> => {
    const response = await fetch(`/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    return response.json();
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }

    return response.json();
  },

  getCurrentUser: async (): Promise<any> => { // Changed to any if User type is not imported
    const response = await fetch(`/api/auth/me`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to get current user');
    }
    
    return response.json();
  },

  // Leave APIs
  createLeave: async (leaveData: LeaveFormData): Promise<any> => {
    const response = await fetch(`/api/leaves`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(leaveData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create leave');
    }
    
    return response.json();
  },

  getMyLeaves: async (): Promise<any[]> => {
    const response = await fetch(`/api/leaves/my-leaves`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch leaves');
    }
    
    return response.json();
  },

  getAllLeaves: async (): Promise<any[]> => {
    const response = await fetch(`/api/leaves`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch all leaves');
    }
    
    return response.json();
  },

  getAllDashboardLeaves: async (month?: number, year?: number): Promise<any[]> => {
    let url = `/api/leave-dashboard`;
    if (month && year) {
      url += `?month=${month}&year=${year}`;
    }

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch all leaves');
    }
    
    return response.json();
  },

  updateLeaveStatus: async (
    leaveId: number, 
    status: 'APPROVED' | 'REJECTED', 
    comment?: string
  ): Promise<any> => {
    const response = await fetch(`/api/leaves/${leaveId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        status,
        comment 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update leave status');
    }

    return response.json();
  },

  updateLeaveComment: async (
    leaveId: number, 
    managerComment: string
  ): Promise<any> => {
    const response = await fetch(`/api/leaves/${leaveId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        managerComment, 
        commentOnly: true 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save comment');
    }

    return response.json();
  },

  deleteLeave: async (leaveId: number): Promise<void> => {
    const response = await fetch(`/api/leaves/${leaveId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete leave');
    }
  },

  getStats: async (month?: number, year?: number): Promise<Stats> => {
    let url = `/api/leaves/stats`;
    if (month && year) {
      url += `?month=${month}&year=${year}`;
    }

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    const data = await response.json();
    return {
      total: parseInt(data.total),
      pending: parseInt(data.pending),
      approved: parseInt(data.approved),
      wfh: parseInt(data.wfh),
    };
  },

  getEmployeeWorkStatus: async (month?: number, year?: number): Promise<any[]> => {
    let url = `/api/employee-work-status`;
    if (month && year) {
      url += `?month=${month}&year=${year}`;
    }

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch employee work status');
    }
    
    return response.json();
  },
};