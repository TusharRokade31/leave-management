import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const body = await req.json();
    const { date, content, managerComment, employeeId, assignedTasks } = body;

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const isManager = authUser.role === 'MANAGER';
    const targetUserId = isManager && employeeId ? parseInt(employeeId) : authUser.id;

    // 1. Primary Daily Log Record (Upsert)
    const taskRecord = await prisma.task.upsert({
      where: { userId_date: { userId: targetUserId, date: normalizedDate } },
      update: { 
        managerComment: isManager ? managerComment : undefined,
        content: !isManager ? content : undefined,
        updatedAt: new Date()
      },
      create: {
        userId: targetUserId,
        date: normalizedDate,
        content: content || "",
        managerComment: managerComment || null,
        status: 'PRESENT',
        isCompleted: false, 
      },
    });

    // 2. Manager Assignment Persistence
    if (isManager && Array.isArray(assignedTasks)) {
      const dayEnd = new Date(normalizedDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      await prisma.$transaction([
        prisma.assignedTask.deleteMany({
          where: { 
            userId: targetUserId, 
            createdAt: { gte: normalizedDate, lte: dayEnd } 
          }
        }),
        prisma.assignedTask.createMany({
          data: assignedTasks.map((t: any) => ({
            userId: targetUserId,
            companyName: String(t.company || t.companyName || ""),
            taskTitle: String(t.task || t.taskTitle || ""),
            status: t.status || (t.isDone ? "COMPLETED" : "ASSIGNED"),
            isDone: Boolean(t.isDone),
            managerComment: t.managerComment || null,
            commentHistory: t.commentHistory || [], 
            createdAt: t.assignedAt ? new Date(t.assignedAt) : new Date() 
          }))
        })
      ]);
    } 
    // 3. EMPLOYEE SYNC LOGIC
    else if (!isManager && Array.isArray(assignedTasks)) {
      const hasCompletedTask = assignedTasks.some((t: any) => 
        t.isDone === true || t.status?.toUpperCase() === 'COMPLETED'
      );

      const validTasks = assignedTasks.filter(t => t.id);

      await prisma.$transaction([
        ...validTasks.map((t: any) =>
          prisma.assignedTask.update({
            where: { id: t.id },
            data: { 
              isDone: Boolean(t.isDone),
              status: t.status || (t.isDone ? "COMPLETED" : "ASSIGNED"),
              updatedAt: new Date()
            },
          })
        ),
        prisma.task.update({
          where: { userId_date: { userId: targetUserId, date: normalizedDate } },
          data: { isCompleted: hasCompletedTask }
        })
      ]);
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
    
    // ⭐ OPTIMIZATION 1: Target specific user ID early to skip global user scanning
    const filterUserId = userIdParam ? parseInt(userIdParam) : (!isManager ? decoded.id : undefined);

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    }

    // ⭐ OPTIMIZATION 2: If we are looking for a single user (Employee or Specific Review), Query Directly
    if (filterUserId) {
      const [tasks, assignedTasks, leaves] = await Promise.all([
        prisma.task.findMany({
          where: { userId: filterUserId, date: startDate && endDate ? { gte: startDate, lte: endDate } : undefined },
          orderBy: { date: 'asc' }
        }),
        prisma.assignedTask.findMany({
          where: { userId: filterUserId, createdAt: startDate && endDate ? { gte: startDate, lte: endDate } : undefined },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.leave.findMany({
          where: { userId: filterUserId, status: 'APPROVED' },
          select: { startDate: true, endDate: true }
        })
      ]);

      const allDateKeys = new Set([
        ...tasks.map(t => t.date.toISOString().split('T')[0]),
        ...assignedTasks.map(at => at.createdAt.toISOString().split('T')[0])
      ]);

      const result = Array.from(allDateKeys).map(dateKey => {
        const taskRecord = tasks.find(t => t.date.toISOString().split('T')[0] === dateKey);
        const dailyAssigned = assignedTasks.filter(at => at.createdAt.toISOString().split('T')[0] === dateKey);

        return {
          id: taskRecord?.id || null,
          userId: filterUserId,
          date: taskRecord?.date || new Date(dateKey),
          content: taskRecord?.content || "",
          managerComment: taskRecord?.managerComment || null,
          status: taskRecord?.status || 'PRESENT',
          isCompleted: taskRecord?.isCompleted || false,
          assignedTasks: dailyAssigned.map(at => ({
            id: at.id,
            company: at.companyName,
            task: at.taskTitle,
            status: at.status,
            managerComment: at.managerComment,
            commentHistory: at.commentHistory || [],
            isDone: at.isDone,
            assignedAt: at.createdAt,
            updatedAt: at.updatedAt
          })),
        };
      });

      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return NextResponse.json(result);
    }

    // ⭐ OPTIMIZATION 3: Manager Team View - Efficient batch query
    const usersData = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        endDate: true,
        assignedTasks: {
          where: startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : undefined,
          orderBy: { createdAt: 'desc' }
        },
        tasks: {
          where: startDate && endDate ? { date: { gte: startDate, lte: endDate } } : undefined,
          orderBy: { date: 'asc' }
        },
        leaves: {
          where: { status: 'APPROVED' },
          select: { startDate: true, endDate: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    const managerResult = usersData.map((emp) => {
      const allDateKeys = new Set([
        ...emp.tasks.map(t => new Date(t.date).toISOString().split('T')[0]),
        ...emp.assignedTasks.map(at => new Date(at.createdAt).toISOString().split('T')[0])
      ]);

      const mergedTasks = Array.from(allDateKeys).map(dateKey => {
        const taskRecord = emp.tasks.find(t => new Date(t.date).toISOString().split('T')[0] === dateKey);
        const dailyAssigned = emp.assignedTasks
          .filter((at) => new Date(at.createdAt).toISOString().split('T')[0] === dateKey)
          .map((at) => ({
            id: at.id,
            company: at.companyName, 
            task: at.taskTitle,
            status: at.status,
            managerComment: at.managerComment,
            commentHistory: at.commentHistory || [], 
            isDone: at.isDone,
            assignedAt: at.createdAt,
            updatedAt: at.updatedAt 
          }));

        return {
          id: taskRecord?.id || null, 
          userId: emp.id,
          date: taskRecord?.date || new Date(dateKey), 
          content: taskRecord?.content || "",
          managerComment: taskRecord?.managerComment || null,
          status: taskRecord?.status || 'PRESENT',
          isCompleted: taskRecord?.isCompleted || false,
          assignedTasks: dailyAssigned, 
        };
      });

      mergedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        user: { id: emp.id, name: emp.name, email: emp.email, role: emp.role, endDate: emp.endDate },
        leaves: emp.leaves,
        tasks: mergedTasks, 
        assignedTasks: emp.assignedTasks || [], 
      };
    });

    return NextResponse.json(managerResult);

  } catch (error) {
    console.error('Failed to fetch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}