import { requireAllowedShabakatyUrl } from '@/utils/shabakatyUrl';

// Shabakaty internal HTTPS endpoints use custom/unverified leaf SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
 * This guarantees that redirects from internal Shabakaty CDN nodes stay inside the SSH tunnel 
 * and never leak a 307 Temporary Redirect back to the browser.
 */
export async function fetchWithRedirects(
  initialUrl: string, 
  headers: Headers, 
  maxRedirects = 5,
  signal?: AbortSignal,
): Promise<Response> {
  let currentUrl = requireAllowedShabakatyUrl(initialUrl).href;

  for (let i = 0; i < maxRedirects; i++) {
    const currentHeaders = new Headers(headers);
    if (!currentHeaders.has('User-Agent')) {
      currentHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    currentHeaders.set('Bypass-Tunnel-Reminder', 'true');
    currentHeaders.set('Referer', 'https://cinemana.shabakaty.com/');

    const response = await fetch(currentUrl, {
      headers: currentHeaders,
      redirect: 'manual', // Manually intercept 3xx redirects to keep them inside Node.js
      signal,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;

      try {
        const nextUrl = requireAllowedShabakatyUrl(new URL(location, currentUrl).href).href;
        await response.body?.cancel().catch(() => undefined);
        currentUrl = nextUrl;
      } catch {
        return response;
      }
      continue;
    }

    return response;
  }

  throw new Error('Too many upstream redirects');
}
