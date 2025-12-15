import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);

    if (authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const leaves = await prisma.leave.findMany({
      where: { status: 'APPROVED' },
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