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
    // Fetch all approved leaves for this user globally to verify annual quota usage
    const allApprovedLeaves = await prisma.leave.findMany({
      where: {
        ...baseWhere,
        status: LeaveStatus.APPROVED,
      },
      select: {
        startDate: true,
        endDate: true
      }
    });

    let optionalUsed = false;
    let holidayName = "";
    let optionalHolidayDate = ""; // ✅ Added to track the specific date

    // Extract optional holidays from your holiday data configuration
    const optionalHolidays = HOLIDAY_DATA.filter(h => h.type === 'OPTIONAL');

    // Helper: Standardizes any date input to a local YYYY-MM-DD string
    const toCleanDateString = (dateInput: Date | string) => {
      const d = new Date(dateInput);
      return d.toLocaleDateString('en-CA'); // Outputs "YYYY-MM-DD" reliably
    };

    // Iterate through approved leaves to find a match in the holiday range
    for (const leave of allApprovedLeaves) {
      const startStr = toCleanDateString(leave.startDate);
      const endStr = toCleanDateString(leave.endDate);
      
      // Match the holiday date against the leave range (start <= holiday <= end)
      const usedHoliday = optionalHolidays.find(h => {
        return h.date >= startStr && h.date <= endStr;
      });

      if (usedHoliday) {
        optionalUsed = true;
        holidayName = usedHoliday.name;
        optionalHolidayDate = usedHoliday.date; // ✅ Capture the date
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

    const leaveWhere = { 
      ...commonWhere, 
      type: { not: LeaveType.WORK_FROM_HOME } 
    };
    
    const wfhWhere = { 
      ...commonWhere, 
      type: LeaveType.WORK_FROM_HOME,
      status: LeaveStatus.APPROVED 
    };

    // Parallel count execution
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
      // ✅ Return the date to the frontend
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