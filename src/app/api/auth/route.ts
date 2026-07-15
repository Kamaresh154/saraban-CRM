import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/baseUrl';
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'link'; // 'login' or 'link'

  const sessionCookie = req.cookies.get('vd_session');
  
  // If linking calendar, require session
  if (action === 'link' && !sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = getBaseUrl(req); 
  const redirectUri = `${origin}/api/integrations/google/callback`;

  // Encode action and session context into state parameter
  const stateObj = {
    action,
    userId: sessionCookie?.value || null
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  // Fallback if Google App client credentials are not defined:
  // Redirect to simulated Consent screen, passing state
  if (!clientId || !clientSecret) {
    const mockAuthUrl = `${origin}/auth/google-mock?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    return NextResponse.redirect(mockAuthUrl);
  }

  // Real Google OAuth Redirect URL
  // Request all necessary OpenID and Google Calendar scopes
  const scopes = action === 'login'
  ? ['openid', 'email', 'profile']
  : [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(googleAuthUrl);
}