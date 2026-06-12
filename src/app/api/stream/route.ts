export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const urlParam = req.nextUrl.searchParams.get('url');

  let path: string | null = null;

  if (ref) {
    path = decryptPath(ref);
  } else if (urlParam) {
    if (urlParam.startsWith('http')) {
      try {
        const parsed = new URL(urlParam);
        path = parsed.pathname + parsed.search;
      } catch { /* ignore */ }
    } else {
      try {
        const decoded = atob(urlParam);
        if (decoded.startsWith('http')) {
          const parsed = new URL(decoded);
          path = parsed.pathname + parsed.search;
        }
      } catch { /* ignore */ }
    }
  }

  if (!path) return new NextResponse('Missing stream parameter', { status: 400 });

  let finalPath = path;
  if (path.startsWith('http')) {
    try {
      const parsed = new URL(path);
      finalPath = parsed.pathname + parsed.search;
    } catch { /* ignore */ }
  }

  try {
    const tunnelBase = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';
    const base = tunnelBase.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    const safePath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
    const proxyUrl = `${base}${safePath}`;

    // Vercel CANNOT proxy large video streams reliably:
    // 1. Node.js API hits 4.5MB/10s limits (PIPELINE_ERROR_READ).
    // 2. Rewrites hit 60s connection drops (Freezing).
    // 3. Edge Runtime strips Content-Length header, breaking Range requests completely.
    // The ONLY reliable solution is a direct 302 redirect to the secure Serveo tunnel.
    // Serveo acts as a Reverse Proxy and hides the user's real IP automatically.

    return NextResponse.redirect(proxyUrl, 302);
  } catch (error: any) {
    console.error('Stream redirect error:', error?.message || error);
    return new NextResponse('Stream redirect failed', { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Max-Age': '86400',
    },
  });
}