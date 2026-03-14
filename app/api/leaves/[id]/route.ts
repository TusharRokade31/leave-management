import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { sendLeaveNotification } from '@/lib/email'; 

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = authenticateToken(req);
    const { id } = await params;
    const body = await req.json();

    const existingLeave = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // --- CASE 1: MANAGER ACTIONS ---
    if (authUser.role === 'MANAGER') {
      
      // Sub-case A: Independent Commenting (Discussion Mode)
      if (body.commentOnly) {
        const updatedLeave = await prisma.leave.update({
          where: { id: parseInt(id) },
          data: { 
            managerComment: body.managerComment 
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json(updatedLeave);
      }

      // Sub-case B: Final Approval/Rejection
      if (body.status) {
        const { status, comment } = body;

        if (!['APPROVED', 'REJECTED'].includes(status?.toUpperCase())) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        if (status.toUpperCase() === 'REJECTED' && !comment?.trim()) {
          return NextResponse.json({ error: 'Comment is required when rejecting' }, { status: 400 });
        }

        const updatedLeave = await prisma.leave.update({
          where: { id: parseInt(id) },
          data: {
            status: status.toUpperCase(),
            managerComment: comment?.trim() || null,
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json(updatedLeave);
      }
    }

    // --- CASE 2: EMPLOYEE EDITING THEIR OWN LEAVE ---
    if (authUser.id === existingLeave.userId) {
      
      const createdDate = new Date(existingLeave.createdAt);
      const deadline = new Date(createdDate);
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(12, 0, 0, 0);

      if (new Date() > deadline) {
        return NextResponse.json({ 
          error: 'Edit window closed (12:00 PM next day deadline passed)' 
        }, { status: 403 });
      }

      // ✅ RECALCULATE DAYS LOGIC
      // We use the new dates from the body if provided, otherwise fall back to existing dates
      const newStart = body.startDate ? new Date(body.startDate) : existingLeave.startDate;
      const newEnd = body.endDate ? new Date(body.endDate) : existingLeave.endDate;
      const leaveType = body.type || existingLeave.type;

      let calculatedDays = 1;
      
      // Only calculate difference for multi-day types (FULL or WFH)
      if (['FULL', 'WORK_FROM_HOME'].includes(leaveType)) {
        const d1 = new Date(newStart);
        const d2 = new Date(newEnd);
        // Normalize to noon to avoid daylight savings/timezone issues
        d1.setHours(12, 0, 0, 0);
        d2.setHours(12, 0, 0, 0);
        
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } else {
        // Half-day, Early, Late types are always 1 day (or could be 0.5 depending on your preference)
        calculatedDays = 1;
      }

      const updatedLeave = await prisma.leave.update({
        where: { id: parseInt(id) },
        data: {
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          days: calculatedDays, // ✅ Store the recalculated count
          type: body.type || undefined,
          reason: body.reason || undefined,
          startTime: body.startTime,
          endTime: body.endTime,
          status: 'PENDING', 
          isEdited: true,
          editSummary: body.editSummary || "Updated details",
          updatedAt: new Date(),
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return NextResponse.json(updatedLeave);
    }

    return NextResponse.json({ error: 'Unauthorized action' }, { status: 401 });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Update leave error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Can only delete pending leaves' }, { status: 400 });
    }

    await prisma.leave.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Leave deleted successfully' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Delete leave error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}