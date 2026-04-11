import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

/**
 * GET: Retrieves tasks for the board.
 * Managers see everything. 
 * Employees see their tasks OR the full company pipeline if requested.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');

    let tasks;

    // Logic for Manager
    if (authUser.role === 'MANAGER') {
      tasks = await prisma.assignedTask.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });
    } 
    // Logic for Employee to see "All Assigned Team Members" for their companies
    else if (view === 'company_pipeline') {
      // 1. Find all companies this specific employee is currently assigned to
      const myAssignments = await prisma.assignedTask.findMany({
        where: { userId: authUser.id },
        select: { companyName: true }
      });
      
      const myCompanyNames = Array.from(new Set(myAssignments.map(t => t.companyName).filter((c): c is string => c !== null)));

      // 2. Fetch all tasks for those companies (this includes tasks assigned to teammates)
      tasks = await prisma.assignedTask.findMany({
        where: {
          companyName: { in: myCompanyNames }
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });
    } 
    // Default Employee view (Private)
    else {
      tasks = await prisma.assignedTask.findMany({
        where: { userId: authUser.id },
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Map to the FlattenedTask interface used by TaskManagement.tsx
    const result = tasks.map(t => ({
      id: t.id,
      company: t.companyName,
      task: t.taskTitle,
      status: t.status || 'ASSIGNED',
      employeeName: t.user?.name || 'Unknown',
      employeeId: t.userId,
      date: t.createdAt.toISOString(),
      updatedAt: t.updatedAt?.toISOString(),
      managerComment: t.managerComment,
      commentHistory: t.commentHistory
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Saves/Synchronizes task assignments.
 * (Your provided logic with timestamp preservation)
 */
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
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // 1️⃣ Delete old tasks for this specific day to overwrite
    await prisma.assignedTask.deleteMany({
      where: {
        userId: targetUserId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });

    // 2️⃣ Insert new tasks while preserving time
    const createdTasks = [];
    for (const t of assignedTasks) {
      const finalTimestamp = t.assignedAt ? new Date(t.assignedAt) : new Date();

      const created = await prisma.assignedTask.create({
        data: {
          userId: targetUserId,
          companyName: String(t.company || t.companyName || ""),
          taskTitle: String(t.task || t.taskTitle || ""),
          isDone: Boolean(t.isDone),
          createdAt: finalTimestamp,
        },
      });
      createdTasks.push(created);
    }

    const result = createdTasks.map(t => ({
      id: t.id,
      company: t.companyName,
      task: t.taskTitle,
      isDone: t.isDone,
      assignedAt: t.createdAt,
    }));

    return NextResponse.json({ assignedTasks: result });

  } catch (err: any) {
    console.error("Assignment Save Error:", err);
    return NextResponse.json(
      { error: err.message || 'Failed to synchronize tasks' },
      { status: 500 }
    );
  }
}