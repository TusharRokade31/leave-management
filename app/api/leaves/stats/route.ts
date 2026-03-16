// app/api/leaves/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { LeaveType, LeaveStatus } from '@prisma/client';
import { HOLIDAY_DATA } from '@/lib/holidays';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    // Base filter: If employee, only their data.
    const baseWhere = authUser.role === 'EMPLOYEE' ? { userId: authUser.id } : {};

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // --- 1. ROBUST OPTIONAL HOLIDAY CHECK ---
    // Fetch leaves that are specifically marked as Optional Holiday.
    // We include PENDING to ensure the user doesn't apply for multiple OHs at once.
    const relevantOptionalLeaves = await prisma.leave.findMany({
      where: {
        ...baseWhere,
        status: { in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
        isOptional: true, // ✅ CRITICAL: Strictly ignores legacy leaves where this is false/null
      },
      select: {
        startDate: true,
        endDate: true,
        isOptional: true,
        holidayName: true
      }
    });

    let optionalUsed = false;
    let holidayName = "";
    let optionalHolidayDate = ""; 

    const optionalHolidays = HOLIDAY_DATA.filter(h => h.type === 'OPTIONAL');

    const toCleanDateString = (dateInput: Date | string) => {
      const d = new Date(dateInput);
      return d.toLocaleDateString('en-CA'); 
    };

    // Iterate only through leaves explicitly flagged as Optional
    for (const leave of relevantOptionalLeaves) {
      const startStr = toCleanDateString(leave.startDate);
      const endStr = toCleanDateString(leave.endDate);
      
      const usedHoliday = optionalHolidays.find(h => {
        return h.date >= startStr && h.date <= endStr;
      });

      if (usedHoliday) {
        optionalUsed = true;
        holidayName = usedHoliday.name;
        optionalHolidayDate = usedHoliday.date; 
        break; 
      }
    }

    // --- 2. STANDARD DASHBOARD COUNTS (Filtered by current month view) ---
    let dateFilter = {};
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59);

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

    // Dashboard usually counts standard leaves (Sick, Casual, etc.) separately from WFH
    const leaveWhere = { 
      ...commonWhere, 
      type: { not: LeaveType.WORK_FROM_HOME } 
    };
    
    const wfhWhere = { 
      ...commonWhere, 
      type: LeaveType.WORK_FROM_HOME,
      status: LeaveStatus.APPROVED 
    };

    const [total, pending, approved, rejected, wfh] = await Promise.all([
      prisma.leave.count({ where: leaveWhere }),
      prisma.leave.count({ where: { ...leaveWhere, status: LeaveStatus.PENDING } }),
      prisma.leave.count({ where: { ...leaveWhere, status: LeaveStatus.APPROVED } }),
      prisma.leave.count({ where: { ...leaveWhere, status: LeaveStatus.REJECTED } }),
      prisma.leave.count({ where: wfhWhere }),
    ]);

    return NextResponse.json({
      total: total.toString(),
      pending: pending.toString(),
      approved: approved.toString(),
      rejected: rejected.toString(),
      wfh: wfh.toString(),
      optionalUsed,
      holidayName,
      optionalHolidayDate 
    });
  } catch (err: any) {
    console.error('Get stats error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}