import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    // Destructure managerComment and employeeId from the request body
    const { date, content, managerComment, employeeId } = await req.json();

    // Normalize date to midnight to match the @@unique constraint 
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    /* DETERMINE TARGET USER:
       If a MANAGER is sending an employeeId, we update that employee's task.
       Otherwise, we update the task for the currently authenticated user.
    */
    const isManagerAction = authUser.role === 'MANAGER' && employeeId;
    const targetUserId = isManagerAction ? parseInt(employeeId) : authUser.id;

    // Build the update object dynamically based on permissions
    const updateData: any = {};
    
    if (isManagerAction) {
      // Managers can only update the managerComment field
      if (managerComment !== undefined) {
        updateData.managerComment = managerComment;
      }
    } else {
      // Employees can only update their own task content
      if (content !== undefined) {
        updateData.content = content;
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
        // Ensure default status is set [cite: 6]
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
    const authUser = authenticateToken(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Managers can view any employee's tasks via query param; employees only see their own
    const targetId = authUser.role === 'MANAGER' && userId ? parseInt(userId) : authUser.id;

    const tasks = await prisma.task.findMany({
      where: { userId: targetId },
      orderBy: { date: 'desc' }, // [cite: 6]
    });

    return NextResponse.json(tasks);
  } catch (err: any) {
    console.error("Task Fetch Error:", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}