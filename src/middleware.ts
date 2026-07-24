import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Only protect specific private user routes (favorites & profile)
const isProtectedRoute = createRouteMatcher([
  '/favorites',
  '/favorites/(.*)',
  '/profile'
]);

function decodeTgCookie(tgCookie: string) {
  try {
    const [base64Data] = tgCookie.split('.');
    if (!base64Data) return null;
    const cleanStr = base64Data.replace(/-/g, '+').replace(/_/g, '/');
    const padded = cleanStr.padEnd(cleanStr.length + (4 - (cleanStr.length % 4)) % 4, '=');
    const jsonStr = atob(padded);
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // 1. API routes use getAuthUser() internally. Never block them in middleware!
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 2. Telegram Cookie users bypass Clerk page protection
  const tgCookie = req.cookies.get('telegram_session')?.value;
  if (tgCookie) {
    const decoded = decodeTgCookie(tgCookie);
    if (decoded?.clerkId && (!decoded.exp || Date.now() < decoded.exp)) {
      return NextResponse.next();
    }
  }

  // 3. Otherwise protect page routes using Clerk
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, and explicitly skip media APIs
    '/((?!_next|api/tunnel-video|api/img|api/stream|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for TRPC and other APIs
    '/(api/(?!tunnel-video|img|stream)|trpc)(.*)',
    // Clerk auto-proxy path
    '/__clerk/:path*',
  ],
};
