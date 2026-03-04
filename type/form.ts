// form.ts

// 1. Define the actual Leave object shape to avoid using 'any'
export interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
}

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
  type: 'FULL' | 'HALF' | 'EARLY' | 'LATE' | 'WORK_FROM_HOME';
  startTime?: string;
  endTime?: string;
  slot?: 'FIRST_HALF' | 'SECOND_HALF' | 'CUSTOM' | ''; 
}

export interface Stats {
  total: number;
  pending: number;
  approved: number;
  wfh: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

// 2. Updated this to use the Leave interface instead of 'any'
export interface CreateLeaveResult {
  success: boolean;
  leave: Leave; 
}

export type AuthResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "EMPLOYEE" | "MANAGER";
  };
};