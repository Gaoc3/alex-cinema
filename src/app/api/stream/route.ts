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

  const safePath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
  const lowerPath = safePath.toLowerCase();
  const isSrt = lowerPath.includes('.srt');
  const isVtt = lowerPath.includes('.vtt');

  // For subtitle files: fetch, convert SRT→VTT if needed, and serve directly
  if (isSrt || isVtt) {
    const tunnelBase = TUNNEL_BASE_URL.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    const subtitleUrl = `${tunnelBase}${safePath}`;

    try {
      const res = await fetch(subtitleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Bypass-Tunnel-Reminder': 'true',
          'Referer': 'https://cinemana.shabakaty.com/',
        },
      });

      if (!res.ok) {
        return new NextResponse('Subtitle fetch failed', { status: 502 });
      }

      let text = await res.text();

      // Convert SRT to VTT format
      if (isSrt) {
        text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      }

      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      return new NextResponse('Subtitle fetch failed', { status: 502 });
    }
  }

  // For video/other files: redirect through tunnel
  try {
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