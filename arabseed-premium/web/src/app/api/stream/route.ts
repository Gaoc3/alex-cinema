import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE_URL = 'https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=';

async function fetchWithFallback(url: string, headers: Record<string, string>) {
  // Try direct first
  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 25000);

  try {
    const res = await fetch(url, { headers, signal: directController.signal });
    clearTimeout(directTimeout);
    if (res.ok || res.status === 206) return res;
    console.log(`Stream direct ${res.status}, trying tunnel...`);
  } catch (e: any) {
    clearTimeout(directTimeout);
    if (e.name !== 'AbortError') console.log('Stream direct error:', e.message);
  }

  // Fallback: tunnel (short timeout since tunnel is often down)
  const tunnelUrl = `${TUNNEL_BASE_URL}${encodeURIComponent(url)}`;
  const tunnelController = new AbortController();
  const tunnelTimeout = setTimeout(() => tunnelController.abort(), 20000);

  try {
    const res = await fetch(tunnelUrl, { headers, signal: tunnelController.signal });
    clearTimeout(tunnelTimeout);
    if (res.ok || res.status === 206) return res;
    return res; // Return anyway to propagate status
  } catch (e: any) {
    clearTimeout(tunnelTimeout);
    if (e.name === 'AbortError') throw new Error('Tunnel timeout');
    throw e;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    
    const range = req.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const res = await fetchWithFallback(url, headers);

    if (!res.ok && res.status !== 206) {
      console.error(`Stream proxy error: ${res.status} for ${url}`);
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const responseHeaders = new Headers();
    const contentType = res.headers.get('content-type');
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');
    const acceptRanges = res.headers.get('accept-ranges');

    responseHeaders.set('Content-Type', contentType && contentType.includes('video') ? contentType : 'video/mp4');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);
    
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    return new NextResponse(res.body as any, {
      status: res.status,
      headers: responseHeaders,
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