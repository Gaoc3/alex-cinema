import { NextRequest, NextResponse } from 'next/server';

const ROUTER_CGI = 'http://192.168.1.1/cgi-bin/api?url=';
const HF_TUNNEL = 'https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=';

async function getTotalSize(url: string): Promise<number> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });
    return parseInt(res.headers.get('content-length') || '0');
  } catch {
    return 0;
  }
}

async function fetchWithFallback(url: string, headers: Record<string, string>) {
  // Try direct first
  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 25000);

  try {
    const res = await fetch(url, { headers, signal: directController.signal });
    clearTimeout(directTimeout);
    if (res.ok || res.status === 206) return { type: 'direct' as const, res };
  } catch {
    clearTimeout(directTimeout);
  }

  // Fallback: router CGI (supports Range via query param)
  const range = headers['Range'] || '';
  let cgiUrl = ROUTER_CGI + encodeURIComponent(url);
  if (range) {
    cgiUrl += '&range=' + encodeURIComponent(range);
  }
  const cgiController = new AbortController();
  const cgiTimeout = setTimeout(() => cgiController.abort(), 30000);

  try {
    const res = await fetch(cgiUrl, { signal: cgiController.signal });
    clearTimeout(cgiTimeout);
    if (res.ok) return { type: 'cgi' as const, res, range };
  } catch {
    clearTimeout(cgiTimeout);
  }

  // Last resort: HF Space tunnel
  const tunnelUrl = HF_TUNNEL + encodeURIComponent(url);
  const tunnelController = new AbortController();
  const tunnelTimeout = setTimeout(() => tunnelController.abort(), 20000);

  try {
    const res = await fetch(tunnelUrl, { headers, signal: tunnelController.signal });
    clearTimeout(tunnelTimeout);
    if (res.ok) return { type: 'tunnel' as const, res };
    return { type: 'tunnel' as const, res };
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
    };

    const range = req.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const result = await fetchWithFallback(url, headers);
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

    // CGI fallback returns 200 even for range requests; fix it here
    if (result.type === 'cgi' && range && res.status === 200) {
      const totalSize = await getTotalSize(url);
      if (totalSize > 0) {
        const match = range.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = match[2] ? parseInt(match[2]) : totalSize - 1;
          responseHeaders.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
          responseHeaders.set('Accept-Ranges', 'bytes');
        }
      }
      return new NextResponse(res.body as any, { status: 206, headers: responseHeaders });
    }

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