import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    if (!authUser || authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, assignedTasks, date } = body;

    if (!employeeId || !Array.isArray(assignedTasks) || !date) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const targetUserId = Number(employeeId);

    // Normalize for the deletion range only
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // 1️⃣ Delete old tasks for this specific day
    await prisma.assignedTask.deleteMany({
      where: {
        userId: targetUserId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });

    // 2️⃣ Insert new tasks
    const createdTasks = [];

    for (const t of assignedTasks) {
      // ⭐ FIX: Preserve the existing timestamp if available, 
      // otherwise capture the current real-time. 
      // Do NOT use dayStart (midnight).
      const finalTimestamp = t.assignedAt ? new Date(t.assignedAt) : new Date();

      const created = await prisma.assignedTask.create({
        data: {
          userId: targetUserId,
          companyName: String(t.company || t.companyName || ""),
          taskTitle: String(t.task || t.taskTitle || ""),
          isDone: Boolean(t.isDone),
          createdAt: finalTimestamp, // 👈 Stores full time (HH:mm:ss)
        },
      });

      createdTasks.push(created);
    }

    // 3️⃣ Return mapped response with the new timestamps
    const result = createdTasks.map(t => ({
      id: t.id,
      company: t.companyName,
      task: t.taskTitle,
      isDone: t.isDone,
      assignedAt: t.createdAt, // This now returns the real time to the UI
    }));

    return NextResponse.json({ assignedTasks: result });

  } catch (err: any) {
    console.error("Assignment Save Error FULL:", err);
    return NextResponse.json(
      { error: err.message || 'Failed to synchronize tasks' },
      { status: 500 }
    );
  }
}