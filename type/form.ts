// form.ts
export interface LoginFormData {
  email: string;
  password: string;
}

export interface OTPFormData {
  email: string;
  otp: string;
}

export interface BulkUploadResult {
  success: string[];
  failed: Array<{ email: string; reason: string }>;
  reset: string[];
}

export interface LeaveFormData {
  startDate: string;
  endDate: string;
  reason: string;
  type: 'FULL' | 'HALF' | 'EARLY' | 'LATE';
  startTime?: string;
  endTime?: string;
}

export interface Stats {
  total: number;
  pending: number;
  approved: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface CreateLeaveResult {
  success: boolean;
  leave: Leave;
}

export type AuthResponse = {
  token: string;
  user: {
    id: number;
    password: string;
    name: string;
    email: string;
    role: "EMPLOYEE" | "MANAGER";
  };
};