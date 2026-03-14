import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    // 1. Authorization Check
    const decoded: any = token ? verifyToken(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assignedTaskId, status, managerComment } = body;

    if (!assignedTaskId || !status) {
      return NextResponse.json({ error: 'Missing assignedTaskId or status' }, { status: 400 });
    }

    const normalizedStatus = status.toUpperCase();
    const isManager = decoded.role === 'MANAGER';

    // 2. Optimized Fetch
    const existingTask = await prisma.assignedTask.findUnique({
      where: { id: Number(assignedTaskId) },
      select: { 
        userId: true,
        createdAt: true,
        commentHistory: true, 
        managerComment: true,
        status: true, // ✅ Ensure we fetch current status to log as Origin
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 3. Prepare primary update payload 
    const isTaskDone = normalizedStatus === 'COMPLETED';
    const updateData: any = {
      status: normalizedStatus,
      isDone: isTaskDone,
      // Sets time if moving to COMPLETED, clears it if moving back to other states
      completedAt: isTaskDone ? new Date() : null, 
      updatedAt: new Date(), 
    };

    // 4. Feedback Logic (Appends to history)
    if (isManager && managerComment && typeof managerComment === 'string' && managerComment.trim() !== "") {
      const currentHistory = Array.isArray(existingTask.commentHistory) 
        ? existingTask.commentHistory 
        : [];
      
      const newHistoryEntry = {
        comment: managerComment.trim(),
        // ✅ ORIGIN FIX: Capture the state BEFORE the update
        status: existingTask.status, 
        timestamp: new Date().toISOString(),
        author: decoded.name || 'Manager'
      };

      updateData.commentHistory = [...currentHistory, newHistoryEntry];
      updateData.managerComment = managerComment.trim(); 
      updateData.lastCommentedAt = new Date();
    }

    // 5. TRANSACTION: Ensures UI consistency
    const result = await prisma.$transaction(async (tx) => {
      // A. Update the specific Kanban task
      const updated = await tx.assignedTask.update({
        where: { id: Number(assignedTaskId) },
        data: updateData,
      });

      // B. WORK STATUS TABLE SYNC
      if (normalizedStatus === 'COMPLETED') {
        const logDate = new Date(existingTask.createdAt);
        logDate.setUTCHours(0, 0, 0, 0); 

        await tx.task.upsert({
          where: { 
            userId_date: { 
              userId: existingTask.userId, 
              date: logDate 
            } 
          },
          update: { isCompleted: true },
          create: {
            userId: existingTask.userId,
            date: logDate,
            content: "", 
            status: 'PRESENT',
            isCompleted: true,
          },
        });
      }

      return updated;
    }, {
      timeout: 10000 
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("PATCH SYNC ERROR:", error);
    return NextResponse.json(
      { error: 'Update failed', details: error.message }, 
      { status: 500 }
    );
  }
}