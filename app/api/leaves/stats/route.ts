// app/api/leaves/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { LeaveType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const baseWhere = authUser.role === 'EMPLOYEE' ? { userId: authUser.id } : {};

    // Get query params
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build Date Filter
    let dateFilter = {};
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59);

      // Leaves active during this month
      dateFilter = {
        AND: [
          { startDate: { lte: endOfMonth } },
          { endDate: { gte: startOfMonth } }
        ]
      };
    }

    const commonWhere = {
      ...baseWhere,
      ...dateFilter
    };

    const leaveWhere = { 
      ...commonWhere, 
      type: { not: LeaveType.WORK_FROM_HOME } 
    };
    
    const wfhWhere = { 
      ...commonWhere, 
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