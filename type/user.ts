interface User {
  id: number;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER';
  password: string;
  isActive: boolean;
}