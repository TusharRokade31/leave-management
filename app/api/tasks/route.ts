import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { date, content } = await req.json();

    const task = await prisma.task.upsert({
      where: {
        userId_date: {
          userId: authUser.id,
          date: new Date(date),
        },
      },
      update: { content },
      create: {
        userId: authUser.id,
        date: new Date(date),
        content,
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
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
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}