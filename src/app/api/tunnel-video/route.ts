import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';
import { 
  fetchWithRedirects, 
  getRangeCacheKey, 
  mediaRangeCache, 
  pendingRangePrefetches, 
  prefetchStreamHeadAndTail 
} from '@/utils/proxyHelper';
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

    const internalUrl = approvedUrl.href;
    const rangeHeader = request.headers.get('range');

    // Check RAM cache or await pending prefetch for head/tail range requests
    if (rangeHeader) {
      const cacheKey = getRangeCacheKey(internalUrl, rangeHeader);
      
      if (pendingRangePrefetches.has(cacheKey)) {
        await pendingRangePrefetches.get(cacheKey);
      }

      const cached = mediaRangeCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return new NextResponse(new Uint8Array(cached.buffer), {
          status: 206,
          headers: cached.headers,
        });
      }

      // Check if requested range falls within a cached head/tail chunk
      for (const [ckey, cval] of mediaRangeCache.entries()) {
        if (ckey.startsWith(`${internalUrl}::`) && Date.now() < cval.expiresAt) {
          const reqRangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
          const cachedRangeMatch = cval.headers['content-range']?.match(/bytes (\d+)-(\d+)\/(\d+)/);
          if (reqRangeMatch && cachedRangeMatch) {
            const reqStart = parseInt(reqRangeMatch[1], 10);
            const reqEnd = reqRangeMatch[2] ? parseInt(reqRangeMatch[2], 10) : parseInt(cachedRangeMatch[3], 10) - 1;
            const cStart = parseInt(cachedRangeMatch[1], 10);
            const cEnd = parseInt(cachedRangeMatch[2], 10);
            const total = parseInt(cachedRangeMatch[3], 10);

            if (reqStart >= cStart && reqEnd <= cEnd) {
              const sliceStart = reqStart - cStart;
              const sliceEnd = reqEnd - cStart + 1;
              const slicedBuffer = cval.buffer.subarray(sliceStart, sliceEnd);
              return new NextResponse(new Uint8Array(slicedBuffer), {
                status: 206,
                headers: {
                  'content-length': String(slicedBuffer.length),
                  'accept-ranges': 'bytes',
                  'content-range': `bytes ${reqStart}-${reqEnd}/${total}`,
                  'content-type': 'video/mp4',
                  'cache-control': 'public, max-age=2592000, immutable',
                  'x-accel-buffering': 'no',
                },
              });
            }
          }
        }
      }
    }

    const fetchHeaders = new Headers();
    if (rangeHeader) {
      fetchHeaders.set('range', rangeHeader);
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

    // Trigger non-blocking background prefetch for BOTH HEAD & TAIL Moov atoms if total length is known
    const contentRangeHeader = response.headers.get('content-range');
    if (contentRangeHeader) {
      const match = contentRangeHeader.match(/\/(\d+)$/);
      if (match) {
        const totalLength = parseInt(match[1], 10);
        if (!isNaN(totalLength)) {
          prefetchStreamHeadAndTail(internalUrl, totalLength);
        }
      }
    }

    const responseHeaders = new Headers();
    const headersToKeep = ['content-length', 'accept-ranges', 'content-range', 'cache-control'];
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
    responseHeaders.set('X-Accel-Buffering', 'no');
    responseHeaders.set('Cache-Control', 'public, max-age=2592000, immutable');

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error('Tunnel Video Proxy Error:', error instanceof Error ? error.message : error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
