import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { sendLeaveNotification } from '@/lib/email'; // Ensure this is imported

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

        // Trigger notification for comment
        try {
          await sendLeaveNotification({
            mode: 'COMMENT',
            leave: updatedLeave,
            employeeName: updatedLeave.user.name,
            employeeEmail: updatedLeave.user.email
          });
        } catch (e) { console.error("Comment notification failed"); }

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

        // TRIGGER NOTIFICATION: Manager Decision (Approved/Rejected)
        try {
          await sendLeaveNotification({
            mode: status.toUpperCase(), // 'APPROVED' or 'REJECTED'
            leave: updatedLeave,
            employeeName: updatedLeave.user.name,
            employeeEmail: updatedLeave.user.email
          });
        } catch (e) { console.error("Decision notification failed"); }

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

      const updatedLeave = await prisma.leave.update({
        where: { id: parseInt(id) },
        data: {
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
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

      // TRIGGER NOTIFICATION: Employee Edit
      try {
        await sendLeaveNotification({
          mode: 'EDIT',
          leave: updatedLeave,
          employeeName: updatedLeave.user.name,
          employeeEmail: updatedLeave.user.email,
          editSummary: body.editSummary || "Updated details"
        });
      } catch (e) { console.error("Edit notification failed"); }

      return NextResponse.json(updatedLeave);
    }

    return NextResponse.json({ error: 'Unauthorized action' }, { status: 401 });

  } catch (err: any) {
    console.error('Update leave error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
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
  } catch (err: any) {
    console.error('Delete leave error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}