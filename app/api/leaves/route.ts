import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { sendLeaveNotification } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { startDate, endDate, reason, type, startTime, endTime } = await req.json();

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate time for specific leave types
    if (['HALF', 'EARLY', 'LATE'].includes(type?.toUpperCase()) && !startTime) {
      return NextResponse.json({ error: 'Time is required for this leave type' }, { status: 400 });
    }

    // Date Normalization to prevent timezone shifting (Midday logic)
    const parseLocalDate = (dateStr: string) => {
      const date = new Date(dateStr);
      date.setHours(12, 0, 0, 0); 
      return date;
    };

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const leave = await prisma.leave.create({
      data: {
        userId: authUser.id,
        startDate: start,
        endDate: end,
        reason,
        managerComment: null,
        type: type?.toUpperCase() || 'FULL',
        days,
        startTime: startTime || null,
        endTime: endTime || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (err: any) {
    console.error('Create leave error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');

    /**
     * Logic:
     * 1. If Manager: retrieve all leaves OR filter by userId query param.
     * 2. If Employee: strictly retrieve only their own leaves.
     */
    let whereClause: any = {};

    if (authUser.role === 'MANAGER') {
      if (userIdParam) {
        whereClause.userId = parseInt(userIdParam);
      }
    } else {
      // Employees can only fetch their own leaves for the calendar
      whereClause.userId = authUser.id;
    }

    const leaves = await prisma.leave.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(leaves);
  } catch (err: any) {
    console.error('Get leaves error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}