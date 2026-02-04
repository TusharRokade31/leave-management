import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    const { date, content } = await req.json();

    const task = await prisma.task.upsert({
      where: {
        // You might need a composite unique key in schema for (userId, date)
        // For now, finding by user and date:
        id: (await prisma.task.findFirst({ 
          where: { userId: authUser.id, date: new Date(date) } 
        }))?.id || -1,
      },
      update: { content },
      create: {
        userId: authUser.id,
        date: new Date(date),
        content,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}