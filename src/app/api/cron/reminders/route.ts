import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email';

const CRON_SECRET = process.env.CRON_SECRET || 'vd_sync_cron_secret_12345';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Automatically update follow-ups to OVERDUE if they are past their scheduledAt
    await prisma.followUp.updateMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    // 2. Fetch pending or overdue follow-ups where a reminder hasn't been sent yet
    const pendingFollowUps = await prisma.followUp.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        reminderSent: false,
      },
      include: {
        lead: true,
        assignedTo: true,
      },
    });

    let sentCount = 0;

    for (const item of pendingFollowUps) {
      let offsetMinutes = 0;
      if (item.reminderTiming === '15M_BEFORE') offsetMinutes = 15;
      else if (item.reminderTiming === '1H_BEFORE') offsetMinutes = 60;
      else if (item.reminderTiming === '1D_BEFORE') offsetMinutes = 1440;

      // Trigger time is: scheduled time minus offset minutes
      const triggerTime = new Date(item.scheduledAt.getTime() - offsetMinutes * 60 * 1000);

      if (triggerTime <= now) {
        // Send email reminder
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">Follow-up Reminder: Due Today</h2>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p>Hello <strong>${item.assignedTo.name}</strong>,</p>
            <p>This is a reminder that you have a follow-up task scheduled with a lead today.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 120px;">Lead Name:</td>
                <td style="padding: 8px 0; color: #0f172a;">${item.lead.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Task Type:</td>
                <td style="padding: 8px 0; color: #0f172a; text-transform: capitalize;">${item.type.replace(/_/g, ' ').toLowerCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Scheduled At:</td>
                <td style="padding: 8px 0; color: #0f172a;">${item.scheduledAt.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569; vertical-align: top;">Notes:</td>
                <td style="padding: 8px 0; color: #0f172a;">${item.note || 'No notes provided.'}</td>
              </tr>
            </table>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads?id=${item.leadId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Lead details in CRM</a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 40px; text-align: center;">Saraban CRM Sync Engine</p>
          </div>
        `;

        await sendEmail({
          to: item.assignedTo.email,
          subject: `Follow-up Due Today: ${item.lead.name}`,
          html: emailHtml,
        });

        // Track sending system activity log
        await prisma.activity.create({
          data: {
            leadId: item.leadId,
            userId: item.assignedToId,
            type: 'EMAIL_SENT',
            description: `Follow-up email reminder dispatched to ${item.assignedTo.email} for lead "${item.lead.name}".`,
          },
        });

        // Mark as sent
        await prisma.followUp.update({
          where: { id: item.id },
          data: {
            reminderSent: true,
          },
        });

        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingFollowUps.length,
      sentCount,
      message: `Checked ${pendingFollowUps.length} follow-ups. Sent ${sentCount} reminders.`,
    });
  } catch (err: any) {
    console.error('Reminder cron error:', err);
    return NextResponse.json({ error: err.message || 'Internal cron error' }, { status: 500 });
  }
}
