import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decrypt, encrypt } from '@/lib/crypto';

// Secret token to authorize cron execution, protecting the endpoint
const CRON_SECRET = process.env.CRON_SECRET || 'vd_sync_cron_secret_12345';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  // Verify authorization secret
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const syncs = await prisma.calendarSync.findMany({
      include: {
        user: true,
      },
    });

    const results = [];
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    for (const syncDetails of syncs) {
      const userId = syncDetails.userId;
      const userName = syncDetails.user.name;

      try {
        let currentAccessToken = decrypt(syncDetails.accessToken);
        let currentRefreshToken = decrypt(syncDetails.refreshToken);
        const isMockMode = currentAccessToken.startsWith('mock_') || !clientId || !clientSecret;

        // 1. Token refreshing if expired
        if (!isMockMode && clientId && clientSecret && syncDetails.expiresAt < new Date()) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: currentRefreshToken,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            currentAccessToken = refreshData.access_token;
            const newExpires = new Date(Date.now() + refreshData.expires_in * 1000);

            await prisma.calendarSync.update({
              where: { id: syncDetails.id },
              data: {
                accessToken: encrypt(currentAccessToken),
                expiresAt: newExpires,
              },
            });
          } else {
            console.error(`[Cron Sync] Failed to refresh token for ${userName}`);
            results.push({ user: userName, success: false, error: 'Token refresh failed' });
            continue;
          }
        }

        let pulledCount = 0;
        let pushedCount = 0;

        if (isMockMode) {
          // Simulated Sync for Cron
          const pendingFollowUps = await prisma.followUp.findMany({
            where: { assignedToId: userId, status: 'PENDING' },
          });
          for (const item of pendingFollowUps) {
            let meta: any = {};
            if (item.recurrence) {
              try { meta = JSON.parse(item.recurrence); } catch (_) { meta = {}; }
            }
            if (!meta.googleEventId) {
              meta.googleEventId = `mock_google_event_id_${item.id}`;
              await prisma.followUp.update({
                where: { id: item.id },
                data: { recurrence: JSON.stringify(meta) },
              });
              pushedCount++;
            }
          }
        } else {
          // Real Google Calendar Pull
          const timeMin = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
          const pullRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=30`,
            { headers: { Authorization: `Bearer ${currentAccessToken}` } }
          );

          if (pullRes.ok) {
            const data = await pullRes.json();
            const items = data.items || [];

            for (const event of items) {
              if (!event.start?.dateTime) continue;

              const googleEventId = event.id;
              const existingFollowUp = await prisma.followUp.findFirst({
                where: { recurrence: { contains: googleEventId } },
              });

              if (!existingFollowUp) {
                let attendeeEmail = '';
                if (event.attendees && event.attendees.length > 0) {
                  attendeeEmail = event.attendees.find((a: any) => !a.self)?.email || '';
                }

                let lead = attendeeEmail
                  ? await prisma.lead.findFirst({ where: { email: attendeeEmail } })
                  : null;

                if (!lead) {
                  lead = await prisma.lead.findFirst({ where: { email: 'sync@google.com' } });
                  if (!lead) {
                    lead = await prisma.lead.create({
                      data: {
                        name: 'Google Sync Leads',
                        contactPerson: 'Google Sync',
                        email: 'sync@google.com',
                        source: 'Import',
                        service: 'Website',
                        assignedToId: userId,
                        createdById: userId,
                      },
                    });
                  }
                }

                await prisma.followUp.create({
                  data: {
                    leadId: lead.id,
                    assignedToId: userId,
                    type: 'ZOOM',
                    scheduledAt: new Date(event.start.dateTime),
                    priority: 'MEDIUM',
                    status: 'PENDING',
                    note: event.description || event.summary,
                    recurrence: JSON.stringify({ googleEventId }),
                  },
                });
                pulledCount++;
              }
            }
          }

          // Real Google Calendar Push
          const crmFollowUps = await prisma.followUp.findMany({
            where: { assignedToId: userId, status: 'PENDING' },
            include: { lead: true },
          });

          for (const item of crmFollowUps) {
            let meta: any = {};
            if (item.recurrence) {
              try { meta = JSON.parse(item.recurrence); } catch (_) { meta = {}; }
            }

            const summary = `[VD Connect] Follow-Up: ${item.lead.name} (${item.type})`;
            const description = `${item.note || 'No notes added'}\n\nClient Contact: ${item.lead.contactPerson} (${item.lead.email})`;
            const startTime = new Date(item.scheduledAt);
            const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

            const eventBody = {
              summary,
              description,
              start: { dateTime: startTime.toISOString() },
              end: { dateTime: endTime.toISOString() },
            };

            if (meta.googleEventId) {
              await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${meta.googleEventId}`, {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${currentAccessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
              });
              pushedCount++;
            } else {
              const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${currentAccessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventBody),
              });

              if (createRes.ok) {
                const resData = await createRes.json();
                meta.googleEventId = resData.id;
                await prisma.followUp.update({
                  where: { id: item.id },
                  data: { recurrence: JSON.stringify(meta) },
                });
                pushedCount++;
              }
            }
          }
        }

        // Update lastSyncedAt
        await prisma.calendarSync.update({
          where: { id: syncDetails.id },
          data: { lastSyncedAt: new Date() },
        });

        results.push({ user: userName, success: true, pulled: pulledCount, pushed: pushedCount });
      } catch (err: any) {
        console.error(`[Cron Sync] Error syncing for user ${userName}:`, err);
        results.push({ user: userName, success: false, error: err.message || 'Internal sync error' });
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (err: any) {
    console.error('[Cron Sync] Global error:', err);
    return NextResponse.json({ error: 'Global sync-cron processing failed.' }, { status: 500 });
  }
}
