import { requireAllowedShabakatyUrl } from '@/utils/shabakatyUrl';

// Shabakaty internal HTTPS endpoints use custom/unverified leaf SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// In-memory cache for CDN redirect host mappings (e.g. vascin24-mp4.shabakaty.com -> cnth2.shabakaty.com)
const redirectHostCache = new Map<string, { targetHost: string; expiresAt: number }>();
const REDIRECT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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
  let originalHost = '';

  try {
    const parsed = new URL(initialUrl);
    originalHost = parsed.hostname;
    const cached = redirectHostCache.get(originalHost);
    if (cached && Date.now() < cached.expiresAt) {
      parsed.hostname = cached.targetHost;
      targetUrl = parsed.href;
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
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;

      try {
        const nextUrlObj = requireAllowedShabakatyUrl(new URL(location, currentUrl).href);
        await response.body?.cancel().catch(() => undefined);

        // Cache host mapping for zero-redirect performance on all subsequent range requests!
        if (originalHost && nextUrlObj.hostname && originalHost !== nextUrlObj.hostname) {
          redirectHostCache.set(originalHost, {
            targetHost: nextUrlObj.hostname,
            expiresAt: Date.now() + REDIRECT_CACHE_TTL,
          });
        }

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
