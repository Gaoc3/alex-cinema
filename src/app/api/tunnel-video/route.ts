import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects } from '@/utils/proxyHelper';
import { isHlsUrl, resolveShabakatyReference } from '@/utils/shabakatyUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ref = searchParams.get('ref');

    if (!ref) {
      return new NextResponse('Missing ref', { status: 400 });
    }

    const decrypted = decryptPath(ref);
    if (!decrypted) {
      return new NextResponse('Invalid ref', { status: 400 });
    }

    const approvedUrl = resolveShabakatyReference(decrypted);
    if (!approvedUrl) {
      return new NextResponse('Invalid decrypted path format', { status: 400 });
    }
    if (isHlsUrl(approvedUrl.href)) {
      return NextResponse.redirect(new URL(`/api/hls?ref=${encodeURIComponent(ref)}`, request.nextUrl.origin));
    }

    // We need to fetch the video through the SSH tunnel, passing the Range header.
    // By using fetch() in Node.js, we automatically follow any 302 redirects from the CDN,
    // so the browser never sees the redirect and the URL remains /api/tunnel-video!
    const internalUrl = approvedUrl.href;
    
    const fetchHeaders = new Headers();
    if (request.headers.has('range')) {
      fetchHeaders.set('range', request.headers.get('range')!);
    }
    fetchHeaders.set('Bypass-Tunnel-Reminder', 'true');
    fetchHeaders.set('Referer', 'https://cinemana.shabakaty.com/');
    fetchHeaders.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    const response = await fetchWithRedirects(internalUrl, fetchHeaders, 5, controller.signal);
    clearTimeout(timeout);

    if (!response.ok && response.status !== 206) {
      console.error(`Tunnel Video Proxy failed with status: ${response.status}`, response.url);
      await response.body?.cancel().catch(() => undefined);
      return new NextResponse(`Proxy error: ${response.status}`, { status: response.status });
    }

    const responseHeaders = new Headers();
    // Copy essential media headers back to the browser
    const headersToKeep = [
      'content-length',
      'accept-ranges',
      'content-range',
      'cache-control'
    ];
    
    headersToKeep.forEach(h => {
      if (response.headers.has(h)) {
        responseHeaders.set(h, response.headers.get(h)!);
      }
    });
    const extension = approvedUrl.pathname.toLowerCase().split('.').pop();
    const upstreamType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const mediaType = /^(?:video|audio)\/[a-z0-9.+-]+$/.test(upstreamType)
      ? upstreamType
      : extension === 'mp4'
      ? 'video/mp4'
      : extension === 'ts'
        ? 'video/mp2t'
        : extension === 'mkv'
          ? 'video/x-matroska'
          : 'application/octet-stream';
    responseHeaders.set('Content-Type', mediaType);
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    
    // Add aggressive caching headers for the browser
    responseHeaders.set('Cache-Control', 'public, max-age=2592000, immutable');

    // Return the response body directly as a stream. 
    // Next.js App Router natively handles ReadableStream backpressure.
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error('Tunnel Video Proxy Error:', error instanceof Error ? error.message : error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
