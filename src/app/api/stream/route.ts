import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const urlParam = req.nextUrl.searchParams.get('url');

  let path: string | null = null;

  if (ref) {
    // New server-encrypted path
    path = decryptPath(ref);
    if (!path) {
      return new NextResponse('Invalid ref parameter', { status: 400 });
    }
  } else if (urlParam) {
    // Legacy fallback: try to decode old formats
    if (urlParam.startsWith('http')) {
      try {
        const parsed = new URL(urlParam);
        path = parsed.pathname + parsed.search;
      } catch {
        return new NextResponse('Invalid URL', { status: 400 });
      }
    } else {
      // Try base64 decode as final fallback
      try {
        const decoded = Buffer.from(urlParam, 'base64').toString('utf-8');
        if (decoded.startsWith('http')) {
          const parsed = new URL(decoded);
          path = parsed.pathname + parsed.search;
        }
      } catch { /* ignore */ }
    }
  }

  if (!path) {
    return new NextResponse('Missing or invalid stream parameter', { status: 400 });
  }

  try {
    const tunnelBase = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';
    const base = tunnelBase.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    const safePath = path.startsWith('/') ? path : `/${path}`;
    const proxyUrl = `${base}${safePath}`;

    // We no longer expose the tunnel URL directly to the browser.
    // We redirect to the local /tunnel/ rewrite endpoint, which securely proxies the stream
    // using Next.js native rewrites without memory buffering issues or exposing the target URL.
    
    return NextResponse.redirect(new URL(`/tunnel${safePath}`, req.url), 302);
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