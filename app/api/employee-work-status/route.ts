import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get month and year from query params
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      startDate = new Date(yearNum, monthNum - 1, 1);
      endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    }

    // Fetch all employees with their leaves and tasks
    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,        // ADD THIS
        endDate: true,     // ADD THIS - Critical for offboarding date persistence
        leaves: {
          where: startDate && endDate ? {
            status: 'APPROVED',
            OR: [
              {
                startDate: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              {
                endDate: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              {
                AND: [
                  { startDate: { lte: startDate } },
                  { endDate: { gte: endDate } },
                ],
              },
            ],
          } : {
            status: 'APPROVED',
          },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            type: true,
            status: true,
            reason: true,
            days: true,
            managerComment: true,
          },
          orderBy: {
            startDate: 'asc',
          },
        },
        tasks: {
          where: startDate && endDate ? {
            date: {
              gte: startDate,
              lte: endDate,
            },
          } : undefined,
          select: {
            id: true,
            date: true,
            content: true,
            status: true,
            isCompleted: true,
            managerComment: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform data
    const result = employees.map((emp) => ({
      user: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,        // ADD THIS
        endDate: emp.endDate,  // ADD THIS
      },
      leaves: emp.leaves,
      tasks: emp.tasks,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch employee work status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee work status' },
      { status: 500 }
    );
  }
}