import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const body = await req.json();
    const { date, content, managerComment, employeeId, assignedTasks } = body;

    // 1. Normalize date to UTC midnight for Task table grouping
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const isManager = authUser.role === 'MANAGER';
    const targetUserId = isManager && employeeId ? parseInt(employeeId) : authUser.id;

    // 2. DATA PERSISTENCE (Daily Log & Feedback)
    const taskRecord = await prisma.task.upsert({
      where: { userId_date: { userId: targetUserId, date: normalizedDate } },
      update: { 
        managerComment: isManager ? managerComment : undefined,
        content: !isManager ? content : undefined 
      },
      create: {
        userId: targetUserId,
        date: normalizedDate,
        content: content || "",
        managerComment: managerComment || null,
        status: 'PRESENT',
        isCompleted: true,
      },
    });

    // 3. QUEUE PERSISTENCE (AssignedTask Table)
    if (isManager && Array.isArray(assignedTasks)) {
      const dayEnd = new Date(normalizedDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      await prisma.$transaction([
        // Clear old assignments for this specific day only
        prisma.assignedTask.deleteMany({
          where: { 
            userId: targetUserId, 
            createdAt: { gte: normalizedDate, lte: dayEnd } 
          }
        }),
        // Re-insert with preserved timestamps
        prisma.assignedTask.createMany({
          data: assignedTasks.map((t: any) => {
            // ⭐ FIX: If the UI sends a timestamp (assignedAt), use it. 
            // Otherwise, use current real-time (new Date()). 
            // Never force it to normalized midnight (dayStart).
            const timestamp = t.assignedAt ? new Date(t.assignedAt) : new Date();
            
            return {
              userId: targetUserId,
              companyName: String(t.company || t.companyName || ""),
              taskTitle: String(t.task || t.taskTitle || ""),
              isDone: Boolean(t.isDone),
              createdAt: timestamp 
            };
          })
        })
      ]);
    } 
    // If Employee is marking tasks as done from their dashboard
    else if (!isManager && Array.isArray(assignedTasks)) {
      await Promise.all(
        assignedTasks.map((t: any) =>
          prisma.assignedTask.updateMany({
            where: { id: t.id, userId: targetUserId },
            data: { isDone: Boolean(t.isDone) },
          })
        )
      );
    }

    return NextResponse.json(taskRecord);
  } catch (err: any) {
    console.error("Task Save Error:", err);
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const userIdParam = searchParams.get('userId');

    const isManager = decoded.role === 'MANAGER';
    const filterUserId = isManager && userIdParam ? parseInt(userIdParam) : (!isManager ? decoded.id : undefined);

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      startDate = new Date(yearNum, monthNum - 1, 1);
      endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    }

    const usersData = await prisma.user.findMany({
      where: { 
        role: isManager && !filterUserId ? 'EMPLOYEE' : undefined,
        id: filterUserId 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        endDate: true,
        assignedTasks: {
            where: startDate && endDate ? {
                createdAt: { gte: startDate, lte: endDate }
            } : undefined
        },
        leaves: {
          where: startDate && endDate ? {
            status: 'APPROVED',
            OR: [
              { startDate: { gte: startDate, lte: endDate } },
              { endDate: { gte: startDate, lte: endDate } },
              { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
            ],
          } : { status: 'APPROVED' },
          orderBy: { startDate: 'asc' },
        },
        tasks: {
          where: startDate && endDate ? {
            date: { gte: startDate, lte: endDate },
          } : undefined,
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = usersData.map((emp) => {
      const updatedTasks = emp.tasks.map((taskRecord) => {
        const taskDateKey = new Date(taskRecord.date).toISOString().split('T')[0];

        const dailyAssigned = (emp.assignedTasks || [])
          .filter((at) => new Date(at.createdAt).toISOString().split('T')[0] === taskDateKey)
          .map((at) => ({
            id: at.id,
            company: at.companyName, 
            task: at.taskTitle,      
            isDone: at.isDone,
            assignedAt: at.createdAt // Returns the full timestamp to the UI
          }));

        return {
          ...taskRecord,
          assignedTasks: dailyAssigned, 
        };
      });

      return {
        user: { id: emp.id, name: emp.name, email: emp.email, role: emp.role, endDate: emp.endDate },
        leaves: emp.leaves,
        tasks: updatedTasks,
        assignedTasks: emp.assignedTasks || [], 
      };
    });

    return NextResponse.json(isManager && !userIdParam ? result : result[0]?.tasks || []);
  } catch (error) {
    console.error('Failed to fetch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}