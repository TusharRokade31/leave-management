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

    // 1. Primary Daily Log Record (Upsert for efficiency)
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
    // 3. ⭐ EMPLOYEE SYNC LOGIC (Optimized with Transaction)
    else if (!isManager && Array.isArray(assignedTasks)) {
      const hasCompletedTask = assignedTasks.some((t: any) => 
        t.isDone === true || t.status?.toUpperCase() === 'COMPLETED'
      );

      await prisma.$transaction([
        // Bulk update status for specific task IDs to reduce DB roundtrips
        ...assignedTasks.map((t: any) =>
          prisma.assignedTask.update({
            where: { id: t.id },
            data: { 
              isDone: Boolean(t.isDone),
              status: t.status || (t.isDone ? "COMPLETED" : "ASSIGNED"),
              updatedAt: new Date()
            },
          })
        ),
        // Automatically sync checkmark
        ...(hasCompletedTask ? [
          prisma.task.update({
            where: { userId_date: { userId: targetUserId, date: normalizedDate } },
            data: { isCompleted: true }
          })
        ] : [])
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
    const filterUserId = isManager && userIdParam ? parseInt(userIdParam) : (!isManager ? decoded.id : undefined);

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      startDate = new Date(yearNum, monthNum - 1, 1);
      endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    }

    // Optimization: Selecting only necessary fields to reduce payload size and speed up query
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
          } : undefined,
          select: {
            id: true,
            companyName: true,
            taskTitle: true,
            status: true,
            isDone: true,
            managerComment: true,
            commentHistory: true,
            createdAt: true,
            updatedAt: true
          }
        },
        leaves: {
          where: startDate && endDate ? {
            status: 'APPROVED',
            OR: [
              { startDate: { gte: startDate, lte: endDate } },
              { endDate: { gte: startDate, lte: endDate } },
            ],
          } : { status: 'APPROVED' },
          select: { startDate: true, endDate: true, status: true },
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
            managerComment: true,
            status: true,
            isCompleted: true
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = usersData.map((emp) => {
      const allDateKeys = new Set([
        ...emp.tasks.map(t => new Date(t.date).toISOString().split('T')[0]),
        ...emp.assignedTasks.map(at => new Date(at.createdAt).toISOString().split('T')[0])
      ]);

      const mergedTasks = Array.from(allDateKeys).map(dateKey => {
        const taskRecord = emp.tasks.find(
          t => new Date(t.date).toISOString().split('T')[0] === dateKey
        );

        const dailyAssigned = (emp.assignedTasks || [])
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
        user: { 
          id: emp.id, 
          name: emp.name, 
          email: emp.email, 
          role: emp.role, 
          endDate: emp.endDate, 
          assignedTasks: emp.assignedTasks 
        },
        leaves: emp.leaves,
        tasks: mergedTasks, 
        assignedTasks: emp.assignedTasks || [], 
      };
    });

    return NextResponse.json(isManager && !userIdParam ? result : result[0]?.tasks || []);
  } catch (error) {
    console.error('Failed to fetch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}