import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      message: 'Server and Neon DB connected',
      database: 'Neon Postgres',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: err.message,
      },
      { status: 500 }
    );
  }
}