import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthUser {
  id: number;
  role: string;
}

export function authenticateToken(req: NextRequest): AuthUser {
  // 1. Try to get token from Authorization Header
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.split(' ')[1];

  // 2. If no header, try to get token from Cookies
  if (!token) {
    token = req.cookies.get('authToken')?.value;
  }

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as AuthUser;
    return user;
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

export function generateToken(userId: number, role: string): string {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser {
  try {
    const user = jwt.verify(token, JWT_SECRET) as AuthUser;
    return user;
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
} 