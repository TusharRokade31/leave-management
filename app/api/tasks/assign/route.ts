import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    if (authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { date, employeeId, assignedTasks } = body;

    // Strip time to ensure consistency with the database unique constraint
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const task = await prisma.task.upsert({
      where: {
        userId_date: {
          userId: Number(employeeId),
          date: normalizedDate,
        },
      },
      update: {
        assignedTasks: assignedTasks,
      },
      create: {
        userId: Number(employeeId),
        date: normalizedDate,
        assignedTasks: assignedTasks,
        content: "", // Initial empty log
        status: 'PRESENT',
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    console.error("Assignment Save Error:", err);
    return NextResponse.json({ error: 'Failed to assign tasks' }, { status: 500 });
  }
}