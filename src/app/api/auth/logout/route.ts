import { NextResponse } from 'next/server';
import { TELEGRAM_SESSION_COOKIE } from '@/lib/telegramSession';
import { TELEGRAM_OIDC_TRANSACTION_COOKIE } from '@/lib/telegramOidc';

function getExpectedOrigin(request: Request): string {
  try {
    return new URL(process.env.APP_ORIGIN || request.url).origin;
  } catch {
    return new URL(request.url).origin;
  }
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin || requestOrigin !== getExpectedOrigin(request)) {
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
