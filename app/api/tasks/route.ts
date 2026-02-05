import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { date, content } = await req.json();

    // Normalize date to midnight to match the @@unique constraint
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const task = await prisma.task.upsert({
      where: {
        userId_date: {
          userId: authUser.id,
          date: normalizedDate,
        },
      },
      update: { content },
      create: {
        userId: authUser.id,
        date: normalizedDate,
        content,
      },
    });

    return NextResponse.json(task);
  } catch (err: any) {
    console.error(err); // Log the actual error for debugging
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