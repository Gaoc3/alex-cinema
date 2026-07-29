import { NextResponse } from 'next/server';
import { TELEGRAM_SESSION_COOKIE } from '@/lib/telegramSession';
import { TELEGRAM_OIDC_TRANSACTION_COOKIE } from '@/lib/telegramOidc';

export async function POST() {
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
