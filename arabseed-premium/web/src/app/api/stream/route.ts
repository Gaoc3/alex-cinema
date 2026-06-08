import { NextRequest, NextResponse } from 'next/server';
import { TUNNEL_BASE_URL } from '@/lib/config';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    // Route the video request through the same tunnel proxy that the API uses,
    // because the Shabakaty CDN (cndw2.shabakaty.com) blocks direct connections
    // from non-Shabakaty IPs, which causes 503 errors.
    const tunnelUrl = `${TUNNEL_BASE_URL}${encodeURIComponent(url)}`;

    const headers: Record<string, string> = {
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)',
    };
    
    // Forward the Range header for seeking support
    const range = req.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const res = await fetch(tunnelUrl, { headers });

    if (!res.ok && res.status !== 206) {
      console.error(`Stream proxy error: ${res.status} for ${url}`);
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const responseHeaders = new Headers();
    
    // Copy essential headers from upstream
    const contentType = res.headers.get('content-type');
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');
    const acceptRanges = res.headers.get('accept-ranges');

    // Force video/mp4 content type so Chrome plays MKV files
    responseHeaders.set('Content-Type', contentType && contentType.includes('video') ? contentType : 'video/mp4');
    
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);
    
    // CORS
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

// Handle OPTIONS for CORS preflight
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
