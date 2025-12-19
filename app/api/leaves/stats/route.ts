import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);

    // Base filter: Employees see their own, Managers see all
    const baseWhere = authUser.role === 'EMPLOYEE' ? { userId: authUser.id } : {};

    // 1. Filter for Regular Leaves (Exclude WFH)
    const leaveWhere = { ...baseWhere, type: { not: 'WORK_FROM_HOME' } };
    
    // 2. Filter for WFH only
    const wfhWhere = { ...baseWhere, type: 'WORK_FROM_HOME' };

    const [total, pending, approved, rejected, wfh] = await Promise.all([
      // Count regular leaves only
      prisma.leave.count({ where: leaveWhere }),
      prisma.leave.count({ where: { ...leaveWhere, status: 'PENDING' } }),
      prisma.leave.count({ where: { ...leaveWhere, status: 'APPROVED' } }),
      prisma.leave.count({ where: { ...leaveWhere, status: 'REJECTED' } }),
      
      // Count WFH separately
      prisma.leave.count({ where: wfhWhere }),
    ]);

    return NextResponse.json({
      total: total.toString(),
      pending: pending.toString(),
      approved: approved.toString(),
      rejected: rejected.toString(),
      wfh: wfh.toString(), // Send WFH count to frontend
    });
  } catch (err: any) {
    console.error('Get stats error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}