import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
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

const clerkHandler = clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // API handlers resolve Clerk and Telegram identities through getAuthUser().
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const telegramCookie = req.cookies.get(TELEGRAM_SESSION_COOKIE)?.value;
  let hasValidTelegramSession = false;

  if (telegramCookie) {
    try {
      const session = await parseTelegramSessionToken(telegramCookie);
      if (session?.clerkId) {
        hasValidTelegramSession = true;
        const response = NextResponse.next();
        // Only refresh session cookie on full page document navigations, not on RSC prefetch subrequests
        if (!req.headers.get('rsc')) {
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
        }
        return response;
      }
    } catch {
      hasValidTelegramSession = false;
    }
  }

  // Only protect routes via Clerk if there is NO valid Telegram session
  if (!hasValidTelegramSession && isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  const userAgent = (req.headers.get('user-agent') || '').toLowerCase();

  // Instant pre-Clerk edge redirect for Telegram WebApp clients hitting root or home
  if (userAgent.includes('telegram') && (pathname === '/' || pathname === '/home')) {
    const url = req.nextUrl.clone();
    url.pathname = '/tg-app';
    return NextResponse.redirect(url, 307);
  }

  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    '/',
    '/home',
    '/((?!_next|api/tunnel-video|api/img|api/stream|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api/(?!tunnel-video|img|stream)|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
