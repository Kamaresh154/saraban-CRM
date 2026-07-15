import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { syncFollowUpToGoogle, deleteFollowUpFromGoogle } from '@/lib/googleCalendar';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;
  const { id } = params;

  try {
    const body = await req.json();
    const existingFollowUp = await prisma.followUp.findUnique({
      where: { id },
    });

    if (!existingFollowUp) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const {
      scheduledAt,
      type,
      reminderTiming,
      priority,
      status,
      note,
      assignedToId,
    } = body;

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : existingFollowUp.scheduledAt,
        type: type || existingFollowUp.type,
        reminderTiming: reminderTiming || existingFollowUp.reminderTiming,
        priority: priority || existingFollowUp.priority,
        status: status || existingFollowUp.status,
        note: note !== undefined ? note : existingFollowUp.note,
        assignedToId: assignedToId || existingFollowUp.assignedToId,
      },
    });

    // If completed, log activity
    if (status === 'COMPLETED' && existingFollowUp.status !== 'COMPLETED') {
      await prisma.activity.create({
        data: {
          leadId: existingFollowUp.leadId,
          userId: userId,
          type: 'CALL_COMPLETED',
          description: `Follow-up task (${existingFollowUp.type}) completed: ${note || 'No notes added'}`,
        },
      });
    }

    // Sync to Google Calendar
    await syncFollowUpToGoogle(updated.id, userId);

    return NextResponse.json({ success: true, followUp: updated });
  } catch (error) {
    console.error('Update follow-up error:', error);
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;
  const { id } = params;

  try {
    const existingFollowUp = await prisma.followUp.findUnique({
      where: { id },
    });

    if (existingFollowUp) {
      // Delete from Google Calendar
      await deleteFollowUpFromGoogle(existingFollowUp.recurrence, userId);

      await prisma.followUp.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true, message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error('Delete follow-up error:', error);
    return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 });
  }
}
