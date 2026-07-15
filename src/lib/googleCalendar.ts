import prisma from './db';
import { decrypt, encrypt } from './crypto';

export async function getGoogleAccessToken(userId: string) {
  try {
    const syncDetails = await prisma.calendarSync.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'GOOGLE',
        },
      },
    });

    if (!syncDetails) return null;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    let accessToken = decrypt(syncDetails.accessToken);
    let refreshToken = decrypt(syncDetails.refreshToken);
    
    const isMockMode = accessToken.startsWith('mock_') || !clientId || !clientSecret;
    
    if (isMockMode) {
      return {
        accessToken,
        isMockMode: true,
        syncDetails,
      };
    }

    // Refresh token if expired
    if (syncDetails.expiresAt < new Date()) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;
        const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

        await prisma.calendarSync.update({
          where: { id: syncDetails.id },
          data: {
            accessToken: encrypt(accessToken),
            expiresAt: newExpiresAt,
          },
        });
      } else {
        console.error('Failed to refresh Google OAuth token, using existing token.');
      }
    }

    return {
      accessToken,
      isMockMode: false,
      syncDetails,
    };
  } catch (err) {
    console.error('Error in getGoogleAccessToken:', err);
    return null;
  }
}

export async function syncFollowUpToGoogle(followUpId: string, userId: string) {
  try {
    const authData = await getGoogleAccessToken(userId);
    if (!authData) return; // Google Calendar not linked

    const followUp = await prisma.followUp.findUnique({
      where: { id: followUpId },
      include: { lead: true },
    });
    if (!followUp) return;

    let meta: any = {};
    if (followUp.recurrence) {
      try {
        meta = JSON.parse(followUp.recurrence);
      } catch (_) {
        meta = {};
      }
    }

    const summary = `[VD Connect] Follow-Up: ${followUp.lead.name} (${followUp.type.replace(/_/g, ' ')})`;
    const description = `${followUp.note || 'No notes added'}\n\nClient Contact: ${followUp.lead.contactPerson} (${followUp.lead.email})`;
    const startTime = new Date(followUp.scheduledAt);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 mins duration

    const eventBody = {
      summary,
      description,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    };

    if (authData.isMockMode) {
      // Mock mode event ID generation
      if (!meta.googleEventId) {
        meta.googleEventId = `mock_google_event_id_${followUp.id}`;
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            recurrence: JSON.stringify(meta),
          },
        });
      }
      return;
    }

    // Real Google Calendar API
    if (meta.googleEventId) {
      // Update existing event
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${meta.googleEventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authData.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to update Google event: ${text}`);
        
        // If event was deleted in Google, delete ID from meta and recreate
        if (res.status === 404 || res.status === 410) {
          delete meta.googleEventId;
          const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authData.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
          });
          if (createRes.ok) {
            const data = await createRes.json();
            meta.googleEventId = data.id;
            await prisma.followUp.update({
              where: { id: followUp.id },
              data: { recurrence: JSON.stringify(meta) },
            });
          }
        }
      }
    } else {
      // Create new event
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (res.ok) {
        const resData = await res.json();
        meta.googleEventId = resData.id;
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            recurrence: JSON.stringify(meta),
          },
        });
      } else {
        console.error('Failed to create Google event:', await res.text());
      }
    }
  } catch (err) {
    console.error('syncFollowUpToGoogle error:', err);
  }
}

export async function deleteFollowUpFromGoogle(recurrenceString: string | null, userId: string) {
  if (!recurrenceString) return;
  try {
    let meta: any = {};
    try {
      meta = JSON.parse(recurrenceString);
    } catch (_) {
      return;
    }

    if (!meta.googleEventId || meta.googleEventId.startsWith('mock_')) return;

    const authData = await getGoogleAccessToken(userId);
    if (!authData || authData.isMockMode) return;

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${meta.googleEventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authData.accessToken}`,
      },
    });

    if (!res.ok) {
      console.error('Failed to delete Google Calendar event:', await res.text());
    }
  } catch (err) {
    console.error('deleteFollowUpFromGoogle error:', err);
  }
}
