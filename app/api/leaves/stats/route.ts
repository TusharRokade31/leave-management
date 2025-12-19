import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { LeaveType } from '@prisma/client'; // Import this!

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const baseWhere = authUser.role === 'EMPLOYEE' ? { userId: authUser.id } : {};

    // Use LeaveType.WORK_FROM_HOME instead of the raw string
    const leaveWhere = { 
      ...baseWhere, 
      type: { not: LeaveType.WORK_FROM_HOME } 
    };
    
    const wfhWhere = { 
      ...baseWhere, 
      type: LeaveType.WORK_FROM_HOME 
    };

    const [total, pending, approved, rejected, wfh] = await Promise.all([
      prisma.leave.count({ where: leaveWhere }),
      prisma.leave.count({ where: { ...leaveWhere, status: 'PENDING' } }),
      prisma.leave.count({ where: { ...leaveWhere, status: 'APPROVED' } }),
      prisma.leave.count({ where: { ...leaveWhere, status: 'REJECTED' } }),
      prisma.leave.count({ where: wfhWhere }),
    ]);

    return NextResponse.json({
      total: total.toString(),
      pending: pending.toString(),
      approved: approved.toString(),
      rejected: rejected.toString(),
      wfh: wfh.toString(),
    });
  } catch (err: any) {
    console.error('Get stats error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}