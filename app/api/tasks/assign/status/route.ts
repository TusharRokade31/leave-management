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

    // 2. Optimized Fetch: Get only what we need to minimize DB load
    const existingTask = await prisma.assignedTask.findUnique({
      where: { id: Number(assignedTaskId) },
      select: { 
        userId: true,
        createdAt: true,
        commentHistory: true, 
        managerComment: true,
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 3. Prepare primary update payload
    const updateData: any = {
      status: normalizedStatus,
      isDone: normalizedStatus === 'COMPLETED',
      updatedAt: new Date(), 
    };

    // 4. Feedback Logic (Appends to history)
    if (isManager && managerComment !== undefined && managerComment.trim() !== "") {
      const currentHistory = Array.isArray(existingTask.commentHistory) 
        ? existingTask.commentHistory 
        : [];
      
      const newHistoryEntry = {
        comment: managerComment,
        status: normalizedStatus,
        timestamp: new Date().toISOString(),
        author: decoded.name || 'Manager'
      };

      updateData.commentHistory = [...currentHistory, newHistoryEntry];
      updateData.managerComment = managerComment; 
      updateData.lastCommentedAt = new Date();
    }

    // 5. TRANSACTION: Ensures UI consistency and prevents "vanishing" data
    const result = await prisma.$transaction(async (tx) => {
      // A. Update the specific Kanban task
      const updated = await tx.assignedTask.update({
        where: { id: Number(assignedTaskId) },
        data: updateData,
      });

      // B. WORK STATUS TABLE SYNC:
      // If task is COMPLETED, instantly check the day log for that user
      if (normalizedStatus === 'COMPLETED') {
        const logDate = new Date(existingTask.createdAt);
        logDate.setUTCHours(0, 0, 0, 0); // Target UTC midnight for unique constraint

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
      timeout: 10000 // Extended timeout to handle slow concurrent requests
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