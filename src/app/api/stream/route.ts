export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'http://64.225.99.144';

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
    const safePath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
    
    // We MUST use the Next.js rewrite (/tunnel/...) because it makes the request SAME-ORIGIN.
    // Direct redirects to Serveo fail because Serveo doesn't provide CORS headers, 
    // which breaks the <video crossOrigin="anonymous"> tag in the browser.
    const proxyUrl = `/tunnel${safePath}`;
    
    const response = NextResponse.redirect(new URL(proxyUrl, req.url));
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Range');
    
    return response;
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