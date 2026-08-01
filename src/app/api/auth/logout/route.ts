import { NextResponse } from 'next/server';
import { TELEGRAM_SESSION_COOKIE } from '@/lib/telegramSession';
import { TELEGRAM_OIDC_TRANSACTION_COOKIE } from '@/lib/telegramOidc';

function isAllowedOrigin(request: Request): boolean {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin) return true;

  try {
    const originHost = new URL(requestOrigin).hostname.toLowerCase();
    const reqHost = new URL(request.url).hostname.toLowerCase();
    const headerHost = (request.headers.get('host') || '').split(':')[0].toLowerCase();

    if (
      originHost === reqHost ||
      originHost === headerHost ||
      originHost.endsWith('cinax.live') ||
      originHost === 'localhost' ||
      originHost === '127.0.0.1'
    ) {
      return true;
    }
  } catch {
    // ignore parse error
  }
  return false;
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { success: false, error: 'مصدر الطلب غير مسموح.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );

  response.cookies.set(TELEGRAM_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  response.cookies.set(TELEGRAM_OIDC_TRANSACTION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/telegram',
    expires: new Date(0),
  });

  return response;
}
