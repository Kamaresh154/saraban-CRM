import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: Retrieve counts of owned records for a user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = params.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const leadsCount = await prisma.lead.count({
      where: {
        OR: [
          { assignedToId: userId },
          { createdById: userId }
        ]
      }
    });

    const followUpsCount = await prisma.followUp.count({
      where: { assignedToId: userId }
    });

    const notesCount = await prisma.note.count({
      where: { createdById: userId }
    });

    return NextResponse.json({
      user,
      counts: {
        leads: leadsCount,
        followUps: followUpsCount,
        notes: notesCount,
      }
    });
  } catch (err) {
    console.error('Fetch user counts error:', err);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}

// PATCH: Update user details
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requester = await prisma.user.findUnique({
      where: { id: sessionCookie.value }
    });
    if (!requester || requester.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, phoneNumber, department, status } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
    if (department !== undefined) data.department = department;
    if (status !== undefined) data.status = status;

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data,
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        userId: requester.id,
        type: 'STATUS_CHANGED',
        description: `Team member "${updatedUser.name}" was updated by ${requester.name}.`,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Handle user removal (transfer & delete, or archive)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = params.id;

  try {
    // 1. Authorization check: Admin only
    const requester = await prisma.user.findUnique({
      where: { id: sessionCookie.value }
    });
    if (!requester || requester.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    // Prevent deleting oneself
    if (requester.id === userId) {
      return NextResponse.json({ error: 'Cannot remove your own admin account.' }, { status: 400 });
    }

    const userToRemove = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!userToRemove) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'archive'; // 'archive' or 'transfer'
    const transferToId = searchParams.get('transferToId');

    if (action === 'archive') {
      // Option 2: Archive user (Deactivate)
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: 'INACTIVE' }
      });

      // Audit Log
      await prisma.activity.create({
        data: {
          leadId: (await prisma.lead.findFirst({ select: { id: true } }))?.id || '',
          userId: requester.id,
          type: 'STATUS_CHANGED',
          description: `${requester.name} deactivated/archived team member ${userToRemove.name}.`,
        }
      });

      return NextResponse.json({
        success: true,
        archived: true,
        message: `User ${userToRemove.name} has been archived.`,
      });
    }

    if (action === 'transfer') {
      if (!transferToId) {
        return NextResponse.json({ error: 'Transfer target user ID is required.' }, { status: 400 });
      }

      const transferTarget = await prisma.user.findUnique({
        where: { id: transferToId }
      });
      if (!transferTarget) {
        return NextResponse.json({ error: 'Transfer target user not found.' }, { status: 400 });
      }

      // Execute transfer and deletion in transaction
      await prisma.$transaction([
        // Update Leads
        prisma.lead.updateMany({
          where: { assignedToId: userId },
          data: { assignedToId: transferToId }
        }),
        prisma.lead.updateMany({
          where: { createdById: userId },
          data: { createdById: transferToId }
        }),
        // Update Follow-ups
        prisma.followUp.updateMany({
          where: { assignedToId: userId },
          data: { assignedToId: transferToId }
        }),
        // Update Notes
        prisma.note.updateMany({
          where: { createdById: userId },
          data: { createdById: transferToId }
        }),
        // Update Activities
        prisma.activity.updateMany({
          where: { userId: userId },
          data: { userId: transferToId }
        }),
        // Update Attachments
        prisma.attachment.updateMany({
          where: { uploadedById: userId },
          data: { uploadedById: transferToId }
        }),
        // Delete cascading relationships manually where needed
        prisma.calendarSync.deleteMany({
          where: { userId }
        }),
        prisma.savedFilter.deleteMany({
          where: { userId }
        }),
        // Finally, delete the User record
        prisma.user.delete({
          where: { id: userId }
        })
      ]);

      // Audit Log
      await prisma.activity.create({
        data: {
          leadId: (await prisma.lead.findFirst({ select: { id: true } }))?.id || '',
          userId: requester.id,
          type: 'STATUS_CHANGED',
          description: `${requester.name} removed ${userToRemove.name} and transferred records to ${transferTarget.name}.`,
        }
      });

      return NextResponse.json({
        success: true,
        deleted: true,
        message: `User ${userToRemove.name} removed and records transferred to ${transferTarget.name}.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Failed to process user removal.' }, { status: 500 });
  }
}
