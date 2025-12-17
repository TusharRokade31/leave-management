import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { sendLeaveNotification } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { startDate, endDate, reason, type, startTime, endTime } =
      await req.json();

    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate time for specific leave types
    if (['HALF', 'EARLY', 'LATE'].includes(type?.toUpperCase()) && !startTime) {
      return NextResponse.json(
        { error: 'Time is required for this leave type' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send email notification
    await sendLeaveNotification(
  leave, 
  {
    ...leave.user,
    name: leave.user.name ?? 'Unknown User'
  }, 
  "submitted"
);

    return NextResponse.json(leave, { status: 201 });
  } catch (err: any) {
    console.error('Create leave error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);

    if (authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const leaves = await prisma.leave.findMany({
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
    console.error('Get all leaves error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}