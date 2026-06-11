import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com/cgi-bin/proxy?url=';

async function fetchFromTunnel(url: string, headers: Record<string, string>, range?: string | null) {
  let tunnelUrl = TUNNEL_BASE_URL + encodeURIComponent(url);
  if (range) {
    tunnelUrl += '&range=' + encodeURIComponent(range);
  }

  const tunnelController = new AbortController();
  const tunnelTimeout = setTimeout(() => tunnelController.abort(), 60000);

  try {
    const res = await fetch(tunnelUrl, { headers, signal: tunnelController.signal });
    clearTimeout(tunnelTimeout);
    return { res };
  } catch (e: any) {
    clearTimeout(tunnelTimeout);
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
      'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      'Referer': 'https://cinemana.shabakaty.com/',
      'bypass-tunnel-reminder': 'true'
    };

    const range = req.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const result = await fetchFromTunnel(url, headers, range);
    const res = result.res;

    if (!res.ok && res.status !== 206) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const responseHeaders = new Headers();
    const contentType = res.headers.get('content-type');
    responseHeaders.set('Content-Type', contentType && contentType.includes('video') ? contentType : 'video/mp4');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');
    const acceptRanges = res.headers.get('accept-ranges');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);

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