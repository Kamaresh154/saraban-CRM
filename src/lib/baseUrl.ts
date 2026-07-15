import { NextRequest } from 'next/server';

export function getBaseUrl(req: NextRequest): string {
  const configured = process.env.APP_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return req.nextUrl.origin;
}
