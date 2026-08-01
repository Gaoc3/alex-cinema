import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  createTelegramSessionToken,
  parseTelegramSessionToken,
  TELEGRAM_SESSION_COOKIE,
  TELEGRAM_SESSION_MAX_AGE_SECONDS,
} from '@/lib/telegramSession';

const isProtectedRoute = createRouteMatcher([
  '/favorites',
  '/favorites/(.*)',
  '/profile',
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // API handlers resolve Clerk and Telegram identities through getAuthUser().
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const telegramCookie = req.cookies.get(TELEGRAM_SESSION_COOKIE)?.value;
  if (telegramCookie) {
    const session = await parseTelegramSessionToken(telegramCookie);
    if (session) {
      // Automatic Sliding Session Refresh for Telegram: extends 30 days on every active visit
      const response = NextResponse.next();
      try {
        const freshToken = await createTelegramSessionToken({ clerkId: session.clerkId });
        response.cookies.set(TELEGRAM_SESSION_COOKIE, freshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: TELEGRAM_SESSION_MAX_AGE_SECONDS,
        });
      } catch (err) {
        console.error('[Telegram Session Refresh Error]:', err);
      }
      return response;
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const response = NextResponse.next();
  if (telegramCookie) {
    response.cookies.set(TELEGRAM_SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|api/tunnel-video|api/img|api/stream|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api/(?!tunnel-video|img|stream)|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
