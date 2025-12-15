// leave.ts
interface Leave {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  type: 'FULL' | 'HALF' | 'EARLY' | 'LATE';
  startTime?: string | null;
  endTime?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  }
  days: number;
  requestedAt: string;
  createdAt: string;
}