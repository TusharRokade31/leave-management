import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function GET() {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    if (authUser.role !== 'MANAGER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name } = await req.json();
    const company = await prisma.company.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save company' }, { status: 500 });
  }
}