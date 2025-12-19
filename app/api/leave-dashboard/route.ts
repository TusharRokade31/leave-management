// app/api/leave-dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);

    if (authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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
      
      // Find leaves that overlap with the selected month
      dateFilter = {
        AND: [
          { startDate: { lte: endOfMonth } },
          { endDate: { gte: startOfMonth } }
        ]
      };
    }

    const leaves = await prisma.leave.findMany({
      where: { 
        status: 'APPROVED',
        ...dateFilter
      },
      orderBy: { startDate: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const grouped: Record<number, any> = {};

    leaves.forEach((leave) => {
      const userId = leave.user.id;

      if (!grouped[userId]) {
        grouped[userId] = {
          user: leave.user,
          leaves: [],
        };
      }

      grouped[userId].leaves.push({
        id: leave.id,
        type: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        startTime: leave.startTime,
        endTime: leave.endTime,
      });
    });

    const result = Object.values(grouped);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Approved leaves grouped error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}