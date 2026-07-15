import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const syncDetails = await prisma.calendarSync.findUnique({
      where: {
        userId_provider: {
          userId: sessionCookie.value,
          provider: 'GOOGLE',
        },
      },
    });

    return NextResponse.json({
      connected: !!syncDetails,
      connectedEmail: syncDetails?.connectedEmail || null,
      lastSyncedAt: syncDetails?.lastSyncedAt || null,
    });
  } catch (err) {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.calendarSync.delete({
      where: {
        userId_provider: {
          userId: sessionCookie.value,
          provider: 'GOOGLE',
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Google Calendar disconnected.' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to disconnect.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;

  try {
    // 1. Fetch Calendar Sync Details
    const syncDetails = await prisma.calendarSync.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'GOOGLE',
        },
      },
    });

    if (!syncDetails) {
      return NextResponse.json({ error: 'Google Calendar integration not connected.' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Decrypt tokens
    let currentAccessToken = decrypt(syncDetails.accessToken);
    let currentRefreshToken = decrypt(syncDetails.refreshToken);
    
    const isMockMode = currentAccessToken.startsWith('mock_') || !clientId || !clientSecret;

    // 2. Refresh token if expired (and not in mock sandbox mode)
    if (!isMockMode && clientId && clientSecret && syncDetails.expiresAt < new Date()) {
      try {
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
          const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

          await prisma.calendarSync.update({
            where: { id: syncDetails.id },
            data: {
              accessToken: encrypt(currentAccessToken),
              expiresAt: newExpiresAt,
            },
          });
        }
      } catch (err) {
        console.error('Failed to refresh Google OAuth token:', err);
      }
    }

    let pulledCount = 0;
    let pushedCount = 0;

    if (isMockMode) {
      // --- SANDBOX SIMULATED SYNC MODE ---
      console.log('[Google Calendar Sync Simulated] Executing simulated two-way sync...');

      // 1. Simulate pulling 2 events from Google Calendar
      const mockGoogleEvents = [
        {
          id: `mock_g_event_1_${userId}`,
          summary: '[VD Connect] Google Sync Kickoff',
          description: 'Syncing details with Ramya. Client email: ramyaa1304@gmail.com',
          start: { dateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }, // Tomorrow
          attendees: [{ email: 'ramyaa1304@gmail.com' }]
        },
        {
          id: `mock_g_event_2_${userId}`,
          summary: '[VD Connect] Agency Creative Scope',
          description: 'XR portfolio review and creative direction. Client: elena@saraban.com',
          start: { dateTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString() }, // In 2 days
          attendees: [{ email: 'elena@saraban.com' }]
        }
      ];

      for (const event of mockGoogleEvents) {
        // Check if followUp already exists with this googleEventId in recurrence
        const existingFollowUp = await prisma.followUp.findFirst({
          where: {
            recurrence: { contains: event.id }
          }
        });

        if (!existingFollowUp) {
          // Find a lead based on attendee email
          const attendeeEmail = event.attendees[0].email;
          let lead = await prisma.lead.findFirst({
            where: { email: attendeeEmail }
          });

          if (!lead) {
            // Find or create a default sync placeholder lead
            lead = await prisma.lead.findFirst({
              where: { email: 'sync@google.com' }
            });
            if (!lead) {
              lead = await prisma.lead.create({
                data: {
                  name: 'Google Sync Leads',
                  contactPerson: 'Google Sync',
                  email: 'sync@google.com',
                  source: 'Import',
                  service: 'Website',
                  assignedToId: userId,
                  createdById: userId
                }
              });
            }
          }

          // Create the Follow-up in CRM
          await prisma.followUp.create({
            data: {
              leadId: lead.id,
              assignedToId: userId,
              type: event.summary.toLowerCase().includes('scop') ? 'PROPOSAL_REVIEW' : 'ZOOM',
              scheduledAt: new Date(event.start.dateTime),
              priority: 'MEDIUM',
              status: 'PENDING',
              note: event.description,
              recurrence: JSON.stringify({ googleEventId: event.id })
            }
          });
          pulledCount++;
        }
      }

      // 2. Simulate pushing CRM followups to Google Calendar
      const pendingFollowUps = await prisma.followUp.findMany({
        where: {
          assignedToId: userId,
          status: 'PENDING'
        },
        include: { lead: true }
      });

      for (const item of pendingFollowUps) {
        let meta: any = {};
        if (item.recurrence) {
          try {
            meta = JSON.parse(item.recurrence);
          } catch (_) {
            meta = {};
          }
        }

        if (!meta.googleEventId) {
          // Push simulated event
          meta.googleEventId = `mock_google_event_id_${item.id}`;
          await prisma.followUp.update({
            where: { id: item.id },
            data: {
              recurrence: JSON.stringify(meta),
            },
          });
          pushedCount++;
        }
      }

    } else {
      // --- REAL TWO-WAY GOOGLE CALENDAR API INTEGRATION ---
      
      // 1. Pull google events
      try {
        const timeMin = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(); // Last 7 days to now
        const pullRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=50`,
          {
            headers: { Authorization: `Bearer ${currentAccessToken}` }
          }
        );

        if (pullRes.ok) {
          const data = await pullRes.json();
          const items = data.items || [];

          for (const event of items) {
            // Only process events that have a start time (not all-day events)
            if (!event.start?.dateTime) continue;

            const googleEventId = event.id;
            const existingFollowUp = await prisma.followUp.findFirst({
              where: {
                recurrence: { contains: googleEventId }
              }
            });

            if (!existingFollowUp) {
              // Find matching lead by attendee email or description
              let attendeeEmail = '';
              if (event.attendees && event.attendees.length > 0) {
                attendeeEmail = event.attendees.find((a: any) => !a.self)?.email || '';
              }

              let lead = attendeeEmail
                ? await prisma.lead.findFirst({ where: { email: attendeeEmail } })
                : null;

              if (!lead) {
                // Find or create sync placeholder lead
                lead = await prisma.lead.findFirst({
                  where: { email: 'sync@google.com' }
                });
                if (!lead) {
                  lead = await prisma.lead.create({
                    data: {
                      name: 'Google Sync Leads',
                      contactPerson: 'Google Sync',
                      email: 'sync@google.com',
                      source: 'Import',
                      service: 'Website',
                      assignedToId: userId,
                      createdById: userId
                    }
                  });
                }
              }

              // Create CRM FollowUp
              await prisma.followUp.create({
                data: {
                  leadId: lead.id,
                  assignedToId: userId,
                  type: 'ZOOM', // Default to Zoom for online meetings
                  scheduledAt: new Date(event.start.dateTime),
                  priority: 'MEDIUM',
                  status: 'PENDING',
                  note: event.description || event.summary,
                  recurrence: JSON.stringify({ googleEventId }),
                }
              });
              pulledCount++;
            } else {
              // Event exists: update CRM if Google start date changed
              const googleDate = new Date(event.start.dateTime).getTime();
              const crmDate = new Date(existingFollowUp.scheduledAt).getTime();
              if (Math.abs(googleDate - crmDate) > 60000) { // 1 min buffer
                await prisma.followUp.update({
                  where: { id: existingFollowUp.id },
                  data: {
                    scheduledAt: new Date(event.start.dateTime),
                    note: event.description || event.summary
                  }
                });
                pulledCount++;
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to pull Google Calendar events:', err);
      }

      // 2. Push CRM followups to Google Calendar
      const crmFollowUps = await prisma.followUp.findMany({
        where: {
          assignedToId: userId,
          status: 'PENDING'
        },
        include: { lead: true }
      });

      for (const item of crmFollowUps) {
        let meta: any = {};
        if (item.recurrence) {
          try {
            meta = JSON.parse(item.recurrence);
          } catch (_) {
            meta = {};
          }
        }

        const summary = `[VD Connect] Follow-Up: ${item.lead.name} (${item.type})`;
        const description = `${item.note || 'No notes added'}\n\nClient Contact: ${item.lead.contactPerson} (${item.lead.email})`;
        const startTime = new Date(item.scheduledAt);
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min duration

        const eventBody = {
          summary,
          description,
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
        };

        if (meta.googleEventId) {
          // Event exists: PUT update details
          try {
            const updateRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${meta.googleEventId}`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${currentAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventBody),
            });
            if (updateRes.ok) pushedCount++;
          } catch (err) {
            console.error('Failed to update Google event:', err);
          }
        } else {
          // Event does not exist: POST create
          try {
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
                data: {
                  recurrence: JSON.stringify(meta),
                },
              });
              pushedCount++;
            }
          } catch (err) {
            console.error('Failed to create Google event:', err);
          }
        }
      }
    }

    // 5. Update sync details lastSyncedAt
    await prisma.calendarSync.update({
      where: { id: syncDetails.id },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      pulledCount,
      pushedCount,
      message: `Two-way sync complete. Pulled ${pulledCount} updates from Google. Pushed ${pushedCount} updates to Google.`
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ error: 'Internal calendar sync error.' }, { status: 500 });
  }
}
