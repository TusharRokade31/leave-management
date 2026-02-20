import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, authenticateToken } from '@/lib/auth';

/* =========================================================
   POST
========================================================= */
export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { date, content, managerComment, employeeId, assignedTasks } = await req.json();

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const isManagerAction = authUser.role === 'MANAGER' && employeeId;
    const targetUserId = isManagerAction ? parseInt(employeeId) : authUser.id;

    if (isManagerAction) {
      const task = await prisma.task.upsert({
        where: { userId_date: { userId: targetUserId, date: normalizedDate } },
        update: { managerComment },
        create: {
          userId: targetUserId,
          date: normalizedDate,
          content: "",
          managerComment,
          status: 'PRESENT',
          isCompleted: true,
        },
      });
      return NextResponse.json(task);
    }

    const task = await prisma.task.upsert({
      where: { userId_date: { userId: targetUserId, date: normalizedDate } },
      update: { content },
      create: {
        userId: targetUserId,
        date: normalizedDate,
        content: content || "",
        status: 'PRESENT',
        isCompleted: true,
      },
    });

    if (Array.isArray(assignedTasks)) {
      await Promise.all(
        assignedTasks.map((t: any) =>
          prisma.assignedTask.updateMany({
            where: { id: t.id, userId: targetUserId },
            data: { isDone: Boolean(t.isDone) },
          })
        )
      );
    }

    return NextResponse.json(task);
  } catch (err: any) {
    console.error("Task Save Error:", err);
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
  }
}

/* =========================================================
   GET  (🔥 FIXED — NO MORE VANISHING TASKS)
========================================================= */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date(yearNum, monthNum, 0);
      endDate.setUTCHours(23, 59, 59, 999);
    }

    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        endDate: true,
        assignedTasks: startDate && endDate
          ? { where: { createdAt: { gte: startDate, lte: endDate } } }
          : true,
        leaves: {
          where: startDate && endDate
            ? {
                status: 'APPROVED',
                OR: [
                  { startDate: { gte: startDate, lte: endDate } },
                  { endDate: { gte: startDate, lte: endDate } },
                  { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
                ],
              }
            : { status: 'APPROVED' },
          orderBy: { startDate: 'asc' },
        },
        tasks: {
          where: startDate && endDate
            ? { date: { gte: startDate, lte: endDate } }
            : undefined,
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    /* =========================================================
       MERGE LOGIC
       - Groups AssignedTasks by date
       - Injects them into matching Task
       - Creates synthetic Task if needed
    ========================================================= */

    const result = employees.map((emp) => {
      const assignedByDate: Record<string, any[]> = {};

      // Group assigned tasks by date key
      (emp.assignedTasks || []).forEach((at) => {
        const key = new Date(at.createdAt).toISOString().split('T')[0];

        if (!assignedByDate[key]) assignedByDate[key] = [];

        assignedByDate[key].push({
          id: at.id,
          company: at.companyName,
          task: at.taskTitle,
          isDone: at.isDone,
          assignedAt: at.createdAt,
        });
      });

      const tasksByDate: Record<string, any> = {};

      // Attach assignedTasks to existing Task rows
      emp.tasks.forEach((taskRecord) => {
        const key = new Date(taskRecord.date).toISOString().split('T')[0];

        tasksByDate[key] = {
          ...taskRecord,
          assignedTasks: assignedByDate[key] || [],
        };
      });

      // 🔥 Create synthetic Task if only assignedTasks exist
      Object.keys(assignedByDate).forEach((dateKey) => {
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = {
            id: 0,
            date: new Date(dateKey),
            content: "",
            status: "PRESENT",
            isCompleted: false,
            managerComment: null,
            assignedTasks: assignedByDate[dateKey],
          };
        }
      });

      return {
        user: {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          endDate: emp.endDate,
        },
        leaves: emp.leaves,
        tasks: Object.values(tasksByDate).sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
        assignedTasks: emp.assignedTasks || [],
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}