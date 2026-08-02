import { requireAllowedShabakatyUrl } from '@/utils/shabakatyUrl';

// Shabakaty internal HTTPS endpoints use custom/unverified leaf SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// In-memory cache for CDN redirect host mappings (e.g. vascin24-mp4.shabakaty.com -> cnth2.shabakaty.com)
const redirectHostCache = new Map<string, { targetHost: string; expiresAt: number }>();
const REDIRECT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface CachedRange {
  buffer: Buffer;
  headers: Record<string, string>;
  expiresAt: number;
}
export const mediaRangeCache = new Map<string, CachedRange>();
export const pendingRangePrefetches = new Map<string, Promise<CachedRange | null>>();
const MEDIA_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export function getRangeCacheKey(url: string, rangeHeader: string): string {
  return `${url}::${rangeHeader}`;
}

export function prefetchSingleRange(internalUrl: string, start: number, end: number, totalLength: number): Promise<CachedRange | null> {
  const rangeHeader = `bytes=${start}-${end}`;
  const cacheKey = getRangeCacheKey(internalUrl, rangeHeader);

  const existing = mediaRangeCache.get(cacheKey);
  if (existing && Date.now() < existing.expiresAt) {
    return Promise.resolve(existing);
  }

  if (pendingRangePrefetches.has(cacheKey)) {
    return pendingRangePrefetches.get(cacheKey)!;
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
        expiresAt: Date.now() + MEDIA_CACHE_TTL,
      };
      mediaRangeCache.set(cacheKey, cached);
      return cached;
    }
    return null;
  }).catch(() => null).finally(() => {
    pendingRangePrefetches.delete(cacheKey);
  });

  pendingRangePrefetches.set(cacheKey, promise);
  return promise;
}

export async function prefetchStreamHeadAndTail(internalUrl: string, totalLength?: number): Promise<void> {
  let realLength = totalLength;

  // If totalLength is missing or default dummy, query exact byte length from Shabakaty
  if (!realLength || realLength === 200_000_000) {
    try {
      const h = new Headers();
      h.set('range', 'bytes=0-0');
      h.set('Bypass-Tunnel-Reminder', 'true');
      h.set('Referer', 'https://cinemana.shabakaty.com/');
      const checkRes = await fetchWithRedirects(internalUrl, h, 5);
      const cr = checkRes.headers.get('content-range');
      await checkRes.body?.cancel().catch(() => undefined);
      if (cr) {
        const m = cr.match(/\/(\d+)$/);
        if (m) {
          realLength = parseInt(m[1], 10);
        }
      }
    } catch {}
  }

  const finalLength = realLength || 250_000_000;
  const chunkSize = 6_291_456; // 6 MB covers ALL Shabakaty MP4 moov atoms and initial video frames
  const headEnd = Math.min(chunkSize - 1, finalLength - 1);
  const tailStart = Math.max(0, finalLength - chunkSize);

  const fetchHead = prefetchSingleRange(internalUrl, 0, headEnd, finalLength);
  const fetchTail = prefetchSingleRange(internalUrl, tailStart, finalLength - 1, finalLength);

  await Promise.all([fetchHead, fetchTail]);
}

export const encodeProxyUrl = (url: string): string => {
  if (!url) return '';
  return encodeURIComponent(url);
};

export async function readResponseTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('Upstream response is too large');
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('Upstream response is too large').catch(() => undefined);
        throw new Error('Upstream response is too large');
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

/**
 * Executes a fetch call while intercepting 301, 302, 303, 307, 308 redirects manually in Node.js.
 * Caches redirect hostname mappings so subsequent byte-range stream requests skip redundant 302 roundtrips.
 */
export async function fetchWithRedirects(
  initialUrl: string, 
  headers: Headers, 
  maxRedirects = 5,
  signal?: AbortSignal,
): Promise<Response> {
  let targetUrl = initialUrl;
  let cacheKey = initialUrl;

  try {
    const cached = redirectHostCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      targetUrl = cached.targetHost;
    }
  } catch {
    // ignore parse error
  }

  let currentUrl = requireAllowedShabakatyUrl(targetUrl).href;

  for (let i = 0; i < maxRedirects; i++) {
    const currentHeaders = new Headers(headers);
    if (!currentHeaders.has('User-Agent')) {
      currentHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    currentHeaders.set('Bypass-Tunnel-Reminder', 'true');
    currentHeaders.set('Referer', 'https://cinemana.shabakaty.com/');

    const response = await fetch(currentUrl, {
      headers: currentHeaders,
      redirect: 'manual',
      signal,
      keepalive: true,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;

      try {
        const nextUrlObj = requireAllowedShabakatyUrl(new URL(location, currentUrl).href);
        await response.body?.cancel().catch(() => undefined);

        // Cache exact resolved target URL for zero-redirect performance on all subsequent range requests for this file!
        redirectHostCache.set(cacheKey, {
          targetHost: nextUrlObj.href,
          expiresAt: Date.now() + REDIRECT_CACHE_TTL,
        });

        currentUrl = nextUrlObj.href;
      } catch {
        return response;
      }
      continue;
    }

    return response;
  }

  throw new Error('Too many upstream redirects');
}
