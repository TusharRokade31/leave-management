import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { sendLeaveNotification } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const body = await req.json();

    const { 
      startDate, 
      endDate, 
      reason, 
      type, 
      startTime, 
      endTime,
      isOptional,    
      holidayName    
    } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (['HALF', 'LATE'].includes(type?.toUpperCase()) && !startTime) {
      return NextResponse.json({ error: 'Time is required for this leave type' }, { status: 400 });
    }

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

    // --- OPTIONAL HOLIDAY QUOTA VALIDATION ---
    if (isOptional) {
      const currentYear = start.getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      const existingApprovedOptional = await prisma.leave.findFirst({
        where: {
          userId: authUser.id,
          isOptional: true,
          startDate: { gte: yearStart, lte: yearEnd },
          status: 'APPROVED'
        }
      });

      if (existingApprovedOptional) {
        return NextResponse.json({ 
          error: `You have already used your optional holiday quota for ${currentYear}.` 
        }, { status: 400 });
      }
    }
    // ------------------------------------------

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
        isOptional: isOptional || false, 
        holidayName: holidayName || null  
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // --- NOTIFICATION LOGIC ---
    try {
      await sendLeaveNotification({
        mode: 'NEW',
        leave: leave,
        employeeName: leave.user.name ?? 'Employee',
        employeeEmail: leave.user.email
      });
    } catch (emailErr) {
      console.error('Notification failed but leave was created:', emailErr);
    }
    // ---------------------------

    return NextResponse.json(leave, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Server error';
    console.error('Create leave error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');

    const whereClause: { userId?: number } = {};

    if (authUser.role === 'MANAGER') {
      if (userIdParam) {
        whereClause.userId = parseInt(userIdParam);
      }
    } else {
      whereClause.userId = authUser.id;
    }

    const leaves = await prisma.leave.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true,
        type: true,
        days: true,
        status: true,
        managerComment: true,
        isOptional: true,
        holidayName: true,
        createdAt: true,
        updatedAt: true,
        isEdited: true,
        editSummary: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      }
    });

    return NextResponse.json(leaves);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Server error';
    console.error('Get leaves error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}