import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { syncFollowUpToGoogle } from '@/lib/googleCalendar';
import { sendEmail } from '@/lib/email';

// Fetch follow-ups
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || ''; // PENDING, COMPLETED, OVERDUE, CANCELLED
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

  try {
    // Before returning, let's automatically check and update overdue follow-ups
    const now = new Date();
    await prisma.followUp.updateMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    const where: any = {};
    
    // Non-admin can only see their assigned follow-ups
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role !== 'ADMIN') {
      where.assignedToId = userId;
    }

    if (status) {
      where.status = status;
    }

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        lead: {
          select: { id: true, name: true, companyName: true, contactPerson: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });

    return NextResponse.json({ followUps });
  } catch (error) {
    console.error('Fetch follow-ups error:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}

// Create new follow-up
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;

  try {
    const body = await req.json();
    const {
      leadId,
      assignedToId,
      type,
      scheduledAt,
      reminderTiming,
      priority,
      note,
      isRecurring,
      recurrence,
    } = body;

    if (!leadId || !type || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const targetTime = new Date(scheduledAt);
    const now = new Date();
    const initialStatus = targetTime < now ? 'OVERDUE' : 'PENDING';

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        assignedToId: assignedToId || userId,
        type,
        scheduledAt: targetTime,
        reminderTiming: reminderTiming || 'AT_TIME',
        priority: priority || 'MEDIUM',
        status: initialStatus,
        note,
        isRecurring: isRecurring || false,
        recurrence: recurrence ? JSON.stringify(recurrence) : null,
      },
      include: {
        lead: { select: { name: true } },
      },
    });

    // Log in timeline
    await prisma.activity.create({
      data: {
        leadId,
        userId: userId,
        type: 'FOLLOW_UP_SCHEDULED',
        description: `Follow-up (${type}) scheduled for ${targetTime.toLocaleString()} by user.`,
      },
    });

    // 1. Sync to Google Calendar
    await syncFollowUpToGoogle(followUp.id, userId);

    // 2. Fetch updated follow-up details (with googleEventId in recurrence if synced)
    const freshFollowUp = await prisma.followUp.findUnique({
      where: { id: followUp.id },
      include: { lead: true, assignedTo: true }
    });

    // 3. Send email reminder immediately via Resend
    if (freshFollowUp && freshFollowUp.assignedTo) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">Follow-up Due Today</h2>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p>Hello <strong>${freshFollowUp.assignedTo.name}</strong>,</p>
          <p>A follow-up task has been scheduled for your lead.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 120px;">Lead Name:</td>
              <td style="padding: 8px 0; color: #0f172a;">${freshFollowUp.lead.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569;">Task Type:</td>
              <td style="padding: 8px 0; color: #0f172a; text-transform: capitalize;">${freshFollowUp.type.replace(/_/g, ' ').toLowerCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569;">Scheduled At:</td>
              <td style="padding: 8px 0; color: #0f172a;">${freshFollowUp.scheduledAt.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569; vertical-align: top;">Notes:</td>
              <td style="padding: 8px 0; color: #0f172a;">${freshFollowUp.note || 'No notes provided.'}</td>
            </tr>
          </table>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads?id=${freshFollowUp.leadId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Lead details in CRM</a>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 40px; text-align: center;">Saraban CRM Sync Engine</p>
        </div>
      `;

      await sendEmail({
        to: freshFollowUp.assignedTo.email,
        subject: `Follow-up Due Today: ${freshFollowUp.lead.name}`,
        html: emailHtml,
      });

      // Mark reminder as sent immediately
      await prisma.followUp.update({
        where: { id: freshFollowUp.id },
        data: { reminderSent: true }
      });
    }

    return NextResponse.json({ success: true, followUp });
  } catch (error) {
    console.error('Create follow-up error:', error);
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 });
  }
}
