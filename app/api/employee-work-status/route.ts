import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, authenticateToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { date, content, managerComment, employeeId, assignedTasks } = await req.json();

    // Normalize date to UTC midnight
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const isManagerAction = authUser.role === 'MANAGER' && employeeId;
    const targetUserId = isManagerAction ? parseInt(employeeId) : authUser.id;

    // Fetch existing task (needed for safe merge)
    const existingTask = await prisma.task.findUnique({
      where: {
        userId_date: {
          userId: targetUserId,
          date: normalizedDate,
        },
      },
    });

    const updateData: any = {};
    const incomingTasks = assignedTasks as Prisma.InputJsonValue | undefined;

    // =========================
    // MANAGER FLOW
    // =========================
    if (isManagerAction) {
      if (managerComment !== undefined) {
        updateData.managerComment = managerComment;
      }

      // Manager has full control over assignments
      if (incomingTasks !== undefined) {
        updateData.assignedTasks = incomingTasks;
      }
    }

    // =========================
    // EMPLOYEE FLOW
    // =========================
    else {
      if (content !== undefined) {
        updateData.content = content;
      }

      // Employee can ONLY toggle isDone
      if (incomingTasks !== undefined && existingTask?.assignedTasks) {
        const currentTasks: any[] = existingTask.assignedTasks as any[];

        const mergedTasks = currentTasks.map((task) => {
          const updated = (incomingTasks as any[]).find(
            (t) => t.id === task.id
          );

          if (updated) {
            return {
              ...task,
              isDone: updated.isDone, // Only allow isDone change
            };
          }

          return task;
        });

        updateData.assignedTasks = mergedTasks;
      }
    }

    const task = await prisma.task.upsert({
      where: {
        userId_date: {
          userId: targetUserId,
          date: normalizedDate,
        },
      },
      update: updateData,
      create: {
        userId: targetUserId,
        date: normalizedDate,
        content: content || "",
        managerComment: managerComment || null,
        assignedTasks: incomingTasks || [],
        status: 'PRESENT',
        isCompleted: true,
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    console.error("Task Save Error:", err);
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
  }
}

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

    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        endDate: true,
        leaves: {
          where: startDate && endDate ? {
            status: 'APPROVED',
            OR: [
              { startDate: { gte: startDate, lte: endDate } },
              { endDate: { gte: startDate, lte: endDate } },
              { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
            ],
          } : { status: 'APPROVED' },
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
          orderBy: { startDate: 'asc' },
        },
        tasks: {
          where: startDate && endDate ? {
            date: { gte: startDate, lte: endDate },
          } : undefined,
          select: {
            id: true,
            date: true,
            content: true,
            status: true,
            isCompleted: true,
            managerComment: true,
            assignedTasks: true,
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = employees.map((emp) => ({
      user: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        endDate: emp.endDate,
      },
      leaves: emp.leaves,
      tasks: emp.tasks,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch employee work status:', error);
    return NextResponse.json({ error: 'Failed to fetch employee work status' }, { status: 500 });
  }
}