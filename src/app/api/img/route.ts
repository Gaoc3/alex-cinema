import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';

// CDN path mapping — these domains are NEVER exposed to the client
const CDN_TYPE_MAP: Record<string, string> = {
  poster: '/vascin-poster-images/',
  cover: '/vascin-cover-images/',
};

function sanitizeFilename(file: string): string {
  // Allow only safe characters: alphanumeric, dots, hyphens, underscores
  return file.replace(/[^a-zA-Z0-9._-]/g, '');
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const file = req.nextUrl.searchParams.get('file');
  const ref = req.nextUrl.searchParams.get('ref');

  let path: string;

  if (ref) {
    // Decrypt server-encrypted path (from proxy rewriter or sanitizeVideoData)
    path = decryptPath(ref);
    if (!path) {
      return NextResponse.json({ error: 'Invalid ref' }, { status: 400 });
    }
  } else if (type && file) {
    // Simple type + filename construction
    const basePath = CDN_TYPE_MAP[type];
    if (!basePath) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const safeFile = sanitizeFilename(file);
    if (!safeFile) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }
    path = basePath + safeFile;
  } else {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  if (!path.startsWith('http')) {
    // If it's just a path, construct the full cnth2 shabakaty URL
    path = `https://cnth2.shabakaty.com${path}`;
  }

  const tunnelBase = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';
  const base = tunnelBase.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
  
  let targetUrl = path;
  if (path.startsWith('http')) {
     try {
       const tUrl = new URL(path);
       targetUrl = `${base}${tUrl.pathname}${tUrl.search}`;
     } catch {
       targetUrl = path;
     }
  } else {
     const safePath = path.startsWith('/') ? path : `/${path}`;
     targetUrl = `${base}${safePath}`;
  }

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const headers: Record<string, string> = {
    'User-Agent': ua,
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://cinemana.shabakaty.com/',
    'Bypass-Tunnel-Reminder': 'true',
  };

  // Try tunnel first
  const imgController = new AbortController();
  const imgTimeout = setTimeout(() => imgController.abort(), 8000);
  try {
    const upstreamRes = await fetch(targetUrl, {
      headers,
      method: 'GET',
      redirect: 'follow',
      signal: imgController.signal,
    });
    clearTimeout(imgTimeout);
    if (upstreamRes.ok || upstreamRes.status === 206) {
      const resHeaders = new Headers();
      const contentType = upstreamRes.headers.get('content-type');
      if (contentType) resHeaders.set('Content-Type', contentType);
      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) resHeaders.set('Content-Length', contentLength);
      resHeaders.set('Access-Control-Allow-Origin', '*');
      resHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

      return new NextResponse(upstreamRes.body as any, {
        status: upstreamRes.status,
        headers: resHeaders,
      });
    }
  } catch {
    clearTimeout(imgTimeout);
  }

  // Fallback: try direct fetch to shabakaty CDN (only for type-based requests)
  if (type && file) {
    const directUrl = `https://cnth2.shabakaty.com${CDN_TYPE_MAP[type!]}${sanitizeFilename(file!)}`;
    const directController = new AbortController();
    const directTimeout = setTimeout(() => directController.abort(), 8000);
    try {
      const directRes = await fetch(directUrl, {
        headers: { ...headers, Referer: 'https://cinemana.shabakaty.com/' },
        method: 'GET',
        redirect: 'follow',
        signal: directController.signal,
      });
      clearTimeout(directTimeout);
      if (directRes.ok || directRes.status === 206) {
        const resHeaders = new Headers();
        const contentType = directRes.headers.get('content-type');
        if (contentType) resHeaders.set('Content-Type', contentType);
        const contentLength = directRes.headers.get('content-length');
        if (contentLength) resHeaders.set('Content-Length', contentLength);
        resHeaders.set('Access-Control-Allow-Origin', '*');
        resHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new NextResponse(directRes.body as any, {
          status: directRes.status,
          headers: resHeaders,
        });
      }
    } catch {
      clearTimeout(directTimeout);
    }
  }

  return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
