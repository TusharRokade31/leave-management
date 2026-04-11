import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, authenticateToken } from '@/lib/auth';

/**
 * POST: Handles both Daily Log updates (Task) and Task Assignments (AssignedTask)
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { date, content, managerComment, employeeId, assignedTasks } = body;

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const isManager = authUser.role === 'MANAGER';
    const targetUserId = isManager && employeeId ? parseInt(employeeId) : authUser.id;

    // 1. Primary Daily Log Record (Upsert)
    await prisma.task.upsert({
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

    // 2. Manager Assignment Persistence (Delete and Re-create for the day)
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
            createdAt: t.assignedAt ? new Date(t.assignedAt) : new Date(),
            completedAt: t.completedAt ? new Date(t.completedAt) : (t.isDone ? new Date() : null)
          }))
        })
      ]);
    } 
    // 3. Employee Sync Logic (Update existing task statuses)
    else if (!isManager && Array.isArray(assignedTasks)) {
      const hasCompletedTask = assignedTasks.some((t: any) => 
        t.isDone === true || t.status?.toUpperCase() === 'COMPLETED'
      );

      const validTasks = assignedTasks.filter(t => t.id);

      await prisma.$transaction(async (tx) => {
        for (const t of validTasks) {
          const currentTask = await tx.assignedTask.findUnique({
            where: { id: t.id },
            select: { status: true }
          });

          if (currentTask) {
            const isTaskDone = Boolean(t.isDone);
            const newStatus = t.status || (isTaskDone ? "COMPLETED" : "ASSIGNED");
            
            await tx.assignedTask.update({
              where: { id: t.id },
              data: { 
                isDone: isTaskDone,
                status: newStatus,
                completedAt: isTaskDone ? (t.completedAt ? new Date(t.completedAt) : new Date()) : null,
                updatedAt: new Date()
              },
            });
          }
        }

        // Update main daily log completion flag
        await tx.task.update({
          where: { userId_date: { userId: targetUserId, date: normalizedDate } },
          data: { isCompleted: hasCompletedTask }
        });
      });
    }

    const finalRecord = await prisma.task.findUnique({
      where: { userId_date: { userId: targetUserId, date: normalizedDate } }
    });

    return NextResponse.json(finalRecord);

  } catch (err: any) {
    console.error("Task Save Error:", err);
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
  }
}

/**
 * GET: Retrieves tasks. 
 * Supports: 
 * - Individual Employee View
 * - Global Manager Overview
 * - Unified Company Pipeline View (for teammates)
 */
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
    const view = searchParams.get('view');

    const isManager = decoded.role === 'MANAGER';
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    }

    // --- PIPELINE VIEW ---
    // MANAGER: sees ALL employees' tasks across all companies (no company filter)
    // EMPLOYEE: sees only teammates in their own assigned companies
    if (view === 'company_pipeline') {
      let companyFilter: string[] | undefined;

      if (!isManager) {
        const myAssignments = await prisma.assignedTask.findMany({
          where: { userId: decoded.id },
          select: { companyName: true }
        });
        companyFilter = Array.from(new Set(myAssignments.map(t => t.companyName)));
      }

      const teamTasks = await prisma.assignedTask.findMany({
        where: {
          ...(companyFilter ? { companyName: { in: companyFilter } } : {}),
          createdAt: startDate && endDate ? { gte: startDate, lte: endDate } : undefined
        },
        include: { user: { select: { name: true, id: true } } },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json(teamTasks.map(at => ({
        id: at.id,
        company: at.companyName,
        task: at.taskTitle,
        status: at.status,
        employeeName: at.user?.name || "Unknown",
        employeeId: at.userId,
        isDone: at.isDone,
        date: at.createdAt,
        managerComment: at.managerComment,
        commentHistory: at.commentHistory || []
      })));
    }

    // --- INDIVIDUAL USER LOGIC (Calendar & Task Board) ---
    const filterUserId = userIdParam ? parseInt(userIdParam) : (!isManager ? decoded.id : undefined);

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
          select: { id: true, startDate: true, endDate: true, type: true, status: true, reason: true, isOptional: true, holidayName: true }
        })
      ]);

      const allDateKeys = new Set([
        ...tasks.map(t => t.date.toISOString().split('T')[0]),
        ...assignedTasks.map(at => at.createdAt.toISOString().split('T')[0])
      ]);

      const taskResults = Array.from(allDateKeys).map(dateKey => {
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
            completedAt: at.completedAt,
            updatedAt: at.updatedAt
          })),
        };
      });

      taskResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return NextResponse.json({ tasks: taskResults, leaves });
    }

    // --- MANAGER TEAM OVERVIEW ---
    const usersData = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true, name: true, email: true, role: true, endDate: true,
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
          select: { startDate: true, endDate: true, type: true, status: true, reason: true, isOptional: true, holidayName: true }
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
            id: at.id, company: at.companyName, task: at.taskTitle, status: at.status,
            managerComment: at.managerComment, commentHistory: at.commentHistory || [],
            isDone: at.isDone, assignedAt: at.createdAt, completedAt: at.completedAt, updatedAt: at.updatedAt 
          }));

        return {
          id: taskRecord?.id || null, userId: emp.id, date: taskRecord?.date || new Date(dateKey),
          content: taskRecord?.content || "", managerComment: taskRecord?.managerComment || null,
          status: taskRecord?.status || 'PRESENT', isCompleted: taskRecord?.isCompleted || false,
          assignedTasks: dailyAssigned, 
        };
      });

      mergedTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        user: { id: emp.id, name: emp.name, email: emp.email, role: emp.role, endDate: emp.endDate },
        leaves: emp.leaves,
        tasks: mergedTasks,
        assignedTasks: mergedTasks.flatMap(day => day.assignedTasks),
      };
    });

    return NextResponse.json(managerResult);

  } catch (error) {
    console.error('Failed to fetch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}