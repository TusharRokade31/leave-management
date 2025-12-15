import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);

    const whereClause =
      authUser.role === 'EMPLOYEE' ? { userId: authUser.id } : {};

    const [total, pending, approved, rejected] = await Promise.all([
      prisma.leave.count({ where: whereClause }),
      prisma.leave.count({ where: { ...whereClause, status: 'PENDING' } }),
      prisma.leave.count({ where: { ...whereClause, status: 'APPROVED' } }),
      prisma.leave.count({ where: { ...whereClause, status: 'REJECTED' } }),
    ]);

    return NextResponse.json({
      total: total.toString(),
      pending: pending.toString(),
      approved: approved.toString(),
      rejected: rejected.toString(),
    });
  } catch (err: any) {
    console.error('Get stats error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}