import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');

  let action = 'link';
  let stateUserId: string | null = null;

  // 1. Decode OAuth State Parameter
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf-8'));
      action = decoded.action || 'link';
      stateUserId = decoded.userId || null;
    } catch (err) {
      console.error('Failed to decode state parameter:', err);
    }
  }

  // Fallback check: find user session cookie
  const sessionCookie = req.cookies.get('vd_session');
  const userId = stateUserId || sessionCookie?.value;

  if (action === 'link' && !userId) {
    return NextResponse.redirect(`${req.nextUrl.origin}/calendar?sync=error&message=Session_expired`);
  }

  if (!code) {
    return NextResponse.redirect(`${req.nextUrl.origin}/?error=No_oauth_code_provided`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${req.nextUrl.origin}/api/integrations/google/callback`;

  let accessToken = 'mock_google_access_token_xyz_9988';
  let refreshToken = 'mock_google_refresh_token_abc_7766';
  let expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

  const isMockCode = code.startsWith('mock_');

  // Real OAuth token swap (only if credentials are defined)
  if (clientId && clientSecret && !isMockCode) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errDetails = await tokenRes.text();
        console.error('Google OAuth token swap failed:', errDetails);
        return NextResponse.redirect(`${req.nextUrl.origin}/?error=Token_swap_failed`);
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || refreshToken;
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    } catch (err) {
      console.error('Google OAuth exchange error:', err);
      return NextResponse.redirect(`${req.nextUrl.origin}/?error=OAuth_exchange_error`);
    }
  }

  // Fetch user profile info to capture email and ID (real or mock)
  let googleProfile = {
    id: 'mock_google_profile_id_ramya_1304',
    email: 'ramyaa1304@gmail.com', // Seeded Admin Email for simulation matching
    name: 'Ramya',
  };

  if (clientId && clientSecret && !isMockCode) {
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        googleProfile = {
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
        };
      }
    } catch (err) {
      console.error('Failed to fetch Google profile info:', err);
      if (action === 'login') {
        return NextResponse.redirect(`${req.nextUrl.origin}/?error=Google_profile_fetch_failed`);
      }
    }
  }

  // Encrypt sensitive tokens for DB storage
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = encrypt(refreshToken);

  // 2. Handle Google Login Workflow
  if (action === 'login') {
    try {
      // Look up user by googleId or email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: googleProfile.id },
            { email: googleProfile.email },
          ],
        },
      });

      if (user) {
        // Auto-Link: If matched by email but googleId was not set, or update info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleProfile.id,
            emailVerified: true, // Auto-verify email upon Google sign-in
            failedAttempts: 0,
            lockoutUntil: null,
          },
        });
      } else {
        // Auto-Register: Create new account if not exists
        user = await prisma.user.create({
          data: {
            name: googleProfile.name,
            email: googleProfile.email,
            passwordHash: 'oauth_sign_in_placeholder', // Non-usable credentials password
            googleId: googleProfile.id,
            emailVerified: true,
            role: 'MEMBER',
            status: 'ACTIVE',
          },
        });
      }

      // Set cookie and redirect to dashboard
      const response = NextResponse.redirect(`${req.nextUrl.origin}/dashboard`);
      response.cookies.set('vd_session', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return response;
    } catch (err) {
      console.error('Google login database error:', err);
      return NextResponse.redirect(`${req.nextUrl.origin}/?error=Database_oauth_login_failed`);
    }
  }

  // 3. Handle Calendar Linking Workflow (Default)
  try {
    await prisma.calendarSync.upsert({
      where: {
        userId_provider: {
          userId: userId!,
          provider: 'GOOGLE',
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        connectedEmail: googleProfile.email,
        lastSyncedAt: new Date(),
      },
      create: {
        userId: userId!,
        provider: 'GOOGLE',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        connectedEmail: googleProfile.email,
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.redirect(`${req.nextUrl.origin}/calendar?sync=success`);
  } catch (error) {
    console.error('Google Callback sync database save error:', error);
    return NextResponse.redirect(`${req.nextUrl.origin}/calendar?sync=error&message=Database_error`);
  }
}
