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

  try {
    const tunnelBase = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';
    const base = tunnelBase.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    const safePath = path.startsWith('/') ? path : `/${path}`;
    const proxyUrl = `${base}${safePath}`;

    // Fetch the stream from the tunnel using Web Streams
    const response = await fetch(proxyUrl, {
      headers: {
        'bypass-tunnel-reminder': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(req.headers.get('range') ? { range: req.headers.get('range')! } : {})
      }
    });

    const headers = new Headers();
    const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    headersToForward.forEach(h => {
      if (response.headers.has(h)) headers.set(h, response.headers.get(h)!);
    });

    headers.set('Accept-Ranges', 'bytes');
    if (path.includes('.mp4') && headers.get('content-type') === 'binary/octet-stream') headers.set('Content-Type', 'video/mp4');
    else if (path.includes('.m3u8')) headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    else if (path.includes('.ts')) headers.set('Content-Type', 'video/mp2t');

    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    
    // Return the response body directly as a Web Stream (perfect for Edge runtime)
    return new NextResponse(response.body as any, {
      status: response.status,
      headers
    });
  } catch (error: any) {
    console.error('Stream proxy error:', error?.message || error);
    return new NextResponse('Stream proxy failed', { status: 502 });
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