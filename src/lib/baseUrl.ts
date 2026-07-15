import { NextRequest } from 'next/server';

/**
 * Returns the correct base URL for building redirect URIs (e.g. for Google OAuth).
 *
 * Why this exists: platforms like Render/Vercel terminate HTTPS at a proxy and
 * forward requests to the app over plain HTTP. Relying on `req.nextUrl.origin`
 * in that situation can incorrectly resolve to `http://...`, which will not
 * match an `https://...` redirect URI registered in Google Cloud Console and
 * causes a `redirect_uri_mismatch` error.
 *
 * Set APP_URL in your environment (e.g. "https://saraban-crm.onrender.com")
 * to guarantee the correct scheme + host is always used. Falls back to the
 * request's origin for local development if APP_URL is not set.
 */
export function getBaseUrl(req: NextRequest): string {
  const configured = process.env.APP_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return req.nextUrl.origin;
}
