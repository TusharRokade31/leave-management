import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } // Params is a Promise in newer Next.js
) {
  try {
    const authUser = authenticateToken(req);
    if (!authUser || authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Await params to get the ID
    const resolvedParams = await params;
    const leaveId = parseInt(resolvedParams.id);

    // Validate the ID to prevent the "Argument id is missing" crash
    if (isNaN(leaveId)) {
      return NextResponse.json({ error: 'Invalid leave ID' }, { status: 400 });
    }

    const { targetDate, newType, newStatus, comment } = await req.json();
    const target = new Date(targetDate);
    target.setHours(12, 0, 0, 0);

    // 1. Fetch the original leave
    const original = await prisma.leave.findUnique({ 
      where: { id: leaveId } 
    });

    if (!original) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    const start = new Date(original.startDate);
    const end = new Date(original.endDate);

    // 2. Perform splitting logic in a transaction
    await prisma.$transaction(async (tx) => {
      // Segment BEFORE the target date
      if (target > start) {
        const beforeEnd = new Date(target);
        beforeEnd.setDate(beforeEnd.getDate() - 1);
        
        await tx.leave.create({
          data: {
            ...original,
            id: undefined, // Let Prisma generate a new ID
            endDate: beforeEnd,
            days: Math.ceil((beforeEnd.getTime() - start.getTime()) / 86400000) + 1,
          }
        });
      }

      // THE TARGET DAY (Specific override)
      await tx.leave.create({
        data: {
          ...original,
          id: undefined,
          startDate: target,
          endDate: target,
          type: newType,
          status: newStatus,
          managerComment: comment,
          days: 1
        }
      });

      // Segment AFTER the target date
      if (target < end) {
        const afterStart = new Date(target);
        afterStart.setDate(afterStart.getDate() + 1);

        await tx.leave.create({
          data: {
            ...original,
            id: undefined,
            startDate: afterStart,
            days: Math.ceil((end.getTime() - afterStart.getTime()) / 86400000) + 1,
          }
        });
      }

      // 3. Delete the original bulk record
      await tx.leave.delete({ where: { id: leaveId } });
    });

    return NextResponse.json({ message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('Split Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}