// type/task.ts
export interface Task {
  id: number;
  userId: number;
  date: string;
  content: string; // The pointers
  createdAt: string;
}