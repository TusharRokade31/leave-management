import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { sendLeaveNotification } from '@/lib/email';

interface User {
  id: number;
  name: string | null;  // Allow null
  email: string;        // Keep as string if email is required
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = authenticateToken(req);
    const { id } = await params;

    if (authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { status } = await req.json();

    if (!['APPROVED', 'REJECTED'].includes(status?.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const leave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: { status: status.toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send email notification
    const action = status.toUpperCase() === 'APPROVED' ? 'approved' : 'rejected';
    await sendLeaveNotification(
  leave, 
  {
    ...leave.user,
    name: leave.user.name ?? 'Unknown User'
  }, 
  action
);

    return NextResponse.json(leave);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }
    console.error('Update leave error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = authenticateToken(req);
    const { id } = await params;

    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
    });

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    if (leave.userId !== authUser.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (leave.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete pending leaves' },
        { status: 400 }
      );
    }

    await prisma.leave.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Leave deleted successfully' });
  } catch (err: any) {
    console.error('Delete leave error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}