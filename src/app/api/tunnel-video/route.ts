import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects } from '@/utils/proxyHelper';
import { isHlsUrl, resolveShabakatyReference } from '@/utils/shabakatyUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// RAM cache for MP4 head/tail range requests (caches initial 1MB head & 1MB tail in VPS memory)
export interface CachedRange {
  buffer: Buffer;
  headers: Record<string, string>;
  expiresAt: number;
}
const tailRangeCache = new Map<string, CachedRange>();
const pendingTailPrefetches = new Map<string, Promise<CachedRange | null>>();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

function getCacheKey(url: string, rangeHeader: string): string {
  return `${url}::${rangeHeader}`;
}

export function prefetchSingleRange(internalUrl: string, start: number, end: number, totalLength: number): Promise<CachedRange | null> {
  const rangeHeader = `bytes=${start}-${end}`;
  const cacheKey = getCacheKey(internalUrl, rangeHeader);

  const existingCached = tailRangeCache.get(cacheKey);
  if (existingCached && Date.now() < existingCached.expiresAt) {
    return Promise.resolve(existingCached);
  }

  if (pendingTailPrefetches.has(cacheKey)) {
    return pendingTailPrefetches.get(cacheKey)!;
  }

  const fetchHeaders = new Headers();
  fetchHeaders.set('range', rangeHeader);
  fetchHeaders.set('Bypass-Tunnel-Reminder', 'true');
  fetchHeaders.set('Referer', 'https://cinemana.shabakaty.com/');

  const promise = fetchWithRedirects(internalUrl, fetchHeaders, 5).then(async (res) => {
    if (res.ok || res.status === 206) {
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const cached: CachedRange = {
        buffer,
        headers: {
          'content-length': String(buffer.length),
          'accept-ranges': 'bytes',
          'content-range': res.headers.get('content-range') || `bytes ${start}-${end}/${totalLength}`,
          'content-type': 'video/mp4',
          'cache-control': 'public, max-age=2592000, immutable',
          'x-accel-buffering': 'no',
        },
        expiresAt: Date.now() + CACHE_TTL,
      };
      tailRangeCache.set(cacheKey, cached);
      return cached;
    }
    return null;
  }).catch(() => null).finally(() => {
    pendingTailPrefetches.delete(cacheKey);
  });

  pendingTailPrefetches.set(cacheKey, promise);
  return promise;
}

export function triggerTailPrefetch(internalUrl: string, totalLength: number): Promise<void> {
  if (totalLength < 500_000) return Promise.resolve();

  // Prefetch HEAD (0-1MB) for Request 3 & TAIL (last 1MB) for Request 2 concurrently (ultra-fast 0.4s SSH transfer)
  const headEnd = Math.min(1_048_575, totalLength - 1);
  const tailStart = Math.max(0, totalLength - 1_048_576);
  
  const fetchHead = prefetchSingleRange(internalUrl, 0, headEnd, totalLength);
  const fetchTail = prefetchSingleRange(internalUrl, tailStart, totalLength - 1, totalLength);

  return Promise.all([fetchHead, fetchTail]).then(() => undefined);
}

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
      const cacheKey = getCacheKey(internalUrl, rangeHeader);
      
      if (pendingTailPrefetches.has(cacheKey)) {
        await pendingTailPrefetches.get(cacheKey);
      }

      const cached = tailRangeCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return new NextResponse(new Uint8Array(cached.buffer), {
          status: 206,
          headers: cached.headers,
        });
      }

      // Check if requested range falls within a cached or pending head/tail chunk
      for (const [ckey, cval] of tailRangeCache.entries()) {
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
          triggerTailPrefetch(internalUrl, totalLength);
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
