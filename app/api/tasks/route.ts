import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const body = await req.json();

    const {
      date,
      content,
      managerComment,
      employeeId,
      assignedTasks,
    } = body;

    // ✅ Normalize date to UTC midnight
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // ✅ Determine target user
    const isManager = authUser.role === 'MANAGER';
    const isManagerAction = isManager && employeeId;
    const targetUserId = isManagerAction
      ? parseInt(employeeId)
      : authUser.id;

    // Fetch existing record (important for merging)
    const existingTask = await prisma.task.findUnique({
      where: {
        userId_date: {
          userId: targetUserId,
          date: normalizedDate,
        },
      },
    });

    const updateData: any = {};
    const incomingTasks =
      assignedTasks as Prisma.InputJsonValue | undefined;

    // =========================
    // 🧑‍💼 MANAGER FLOW
    // =========================
    if (isManagerAction) {
      if (managerComment !== undefined) {
        updateData.managerComment = managerComment;
      }

      // Manager can fully override assignments
      if (incomingTasks !== undefined) {
        updateData.assignedTasks = incomingTasks;
      }

      if (content !== undefined) {
        updateData.content = content;
      }
    }

    // =========================
    // 👨‍💻 EMPLOYEE FLOW
    // =========================
    else {
      if (content !== undefined) {
        updateData.content = content;
      }

      // Employee can only toggle isDone
      if (
        incomingTasks !== undefined &&
        existingTask?.assignedTasks
      ) {
        const currentTasks: any[] =
          existingTask.assignedTasks as any[];

        const mergedTasks = currentTasks.map((task) => {
          const updated = (incomingTasks as any[]).find(
            (t) => t.id === task.id
          );

          if (updated) {
            return {
              ...task,
              isDone: updated.isDone,
            };
          }

          return task;
        });

        updateData.assignedTasks = mergedTasks;
      }
    }

    // =========================
    // UPSERT
    // =========================
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
        content: content || '',
        managerComment: managerComment || null,
        assignedTasks: incomingTasks || [],
        status: 'PRESENT',
        isCompleted: true,
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    console.error('Task Save Error:', err);
    return NextResponse.json(
      { error: 'Failed to save task' },
      { status: 500 }
    );
  }
}

// ======================================
// GET TASKS
// ======================================

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const targetUserId =
      authUser.role === 'MANAGER' && userId
        ? parseInt(userId)
        : authUser.id;

    const tasks = await prisma.task.findMany({
      where: { userId: targetUserId },
      select: {
        id: true,
        date: true,
        content: true,
        status: true,
        isCompleted: true,
        managerComment: true,
        assignedTasks: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (err: any) {
    console.error('Task Fetch Error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}