import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects } from '@/utils/proxyHelper';
import { parseAllowedShabakatyUrl, resolveShabakatyReference } from '@/utils/shabakatyUrl';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_BYTES = 36 * 1024 * 1024;
const MAX_CACHE_ITEMS = 128;
const RETRY_DELAYS_MS = [0, 250, 900];

interface CachedImage {
  body: ArrayBuffer;
  contentType: string;
  cachedAt: number;
}

interface ImageCacheState {
  entries: Map<string, CachedImage>;
  bytes: number;
  lastErrorLogAt: number;
}

const globalImageState = globalThis as typeof globalThis & {
  __alexImageCacheState?: ImageCacheState;
};

const imageCacheState = globalImageState.__alexImageCacheState ??= {
  entries: new Map(),
  bytes: 0,
  lastErrorLogAt: 0,
};

const PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" role="img" aria-label="الصورة غير متاحة مؤقتاً">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="0.55" stop-color="#090d16"/>
      <stop offset="1" stop-color="#24090d"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="45%">
      <stop offset="0" stop-color="#e50914" stop-opacity=".28"/>
      <stop offset="1" stop-color="#e50914" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect width="600" height="900" fill="url(#glow)"/>
  <g transform="translate(180 315)" fill="none" stroke="#e50914" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
    <rect x="0" y="30" width="240" height="190" rx="34"/>
    <path d="M0 82h240M58 30l42 52m38-52 42 52"/>
    <path d="M100 126l62 38-62 38z" fill="#e50914" stroke="none"/>
  </g>
  <text x="300" y="600" fill="#f8fafc" font-family="Arial,sans-serif" font-size="34" font-weight="700" text-anchor="middle">ALEX CINEMA</text>
  <text x="300" y="650" fill="#94a3b8" font-family="Arial,sans-serif" font-size="24" text-anchor="middle">الصورة غير متاحة مؤقتاً</text>
</svg>`.trim();

function sanitizeFilename(file: string): string {
  return file.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 255);
}

function imageHeaders(contentType: string, size: number, cacheStatus: 'HIT' | 'MISS') {
  return new Headers({
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Alex-Image-Cache': cacheStatus,
    'X-Content-Type-Options': 'nosniff',
  });
}

function responseFromCachedImage(image: CachedImage, cacheStatus: 'HIT' | 'MISS') {
  return new NextResponse(new Uint8Array(image.body), {
    status: 200,
    headers: imageHeaders(image.contentType, image.body.byteLength, cacheStatus),
  });
}

function getCachedImage(key: string) {
  const image = imageCacheState.entries.get(key);
  if (!image) return null;
  imageCacheState.entries.delete(key);
  imageCacheState.entries.set(key, image);
  return image;
}

function cacheImage(key: string, image: CachedImage) {
  const existing = imageCacheState.entries.get(key);
  if (existing) imageCacheState.bytes -= existing.body.byteLength;
  imageCacheState.entries.delete(key);
  imageCacheState.entries.set(key, image);
  imageCacheState.bytes += image.body.byteLength;

  while (
    imageCacheState.entries.size > MAX_CACHE_ITEMS
    || imageCacheState.bytes > MAX_CACHE_BYTES
  ) {
    const oldestKey = imageCacheState.entries.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const oldest = imageCacheState.entries.get(oldestKey);
    if (oldest) imageCacheState.bytes -= oldest.body.byteLength;
    imageCacheState.entries.delete(oldestKey);
  }
}

function hasValidImageSignature(bytes: Uint8Array, contentType: string) {
  if (bytes.length < 12) return false;
  if (contentType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (contentType === 'image/gif') return String.fromCharCode(...bytes.slice(0, 3)) === 'GIF';
  if (contentType === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  if (contentType === 'image/avif') {
    return String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
      && String.fromCharCode(...bytes.slice(8, 12)).startsWith('avi');
  }
  return false;
}

async function readValidImage(response: Response): Promise<CachedImage | null> {
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (
    !response.ok
    || !ALLOWED_IMAGE_TYPES.has(contentType)
    || (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES)
  ) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  const body = await response.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_IMAGE_BYTES) return null;
  if (!hasValidImageSignature(new Uint8Array(body), contentType)) return null;
  return { body, contentType, cachedAt: Date.now() };
}

function placeholderResponse() {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'Retry-After': '5',
      'X-Alex-Image-Fallback': '1',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function waitForRetry(delayMs: number, signal: AbortSignal) {
  if (delayMs <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  const file = req.nextUrl.searchParams.get('file');
  const ref = req.nextUrl.searchParams.get('ref');

  let target: URL | null = null;
  if (ref) target = resolveShabakatyReference(decryptPath(ref));

  if (!target && file) {
    const fileName = sanitizeFilename(file.split('/').pop() || '');
    if (fileName) {
      const directory = type === 'cover' || type === 'backdrop'
        ? 'vascin-cover-images'
        : 'vascin-poster-images';
      target = parseAllowedShabakatyUrl(`https://cnth2.shabakaty.com/${directory}/${fileName}`);
    }
  }

  if (!target) {
    return NextResponse.json({ error: 'Invalid or missing image parameters' }, { status: 400 });
  }

  const headers = new Headers({
    'Bypass-Tunnel-Reminder': 'true',
    'Referer': 'https://cinemana.shabakaty.com/',
    'User-Agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const candidates = [target];
  if (target.pathname.includes('/vascin-poster-images/')) {
    candidates.push(new URL(target.href.replace('/vascin-poster-images/', '/vascin-cover-images/')));
  } else if (target.pathname.includes('/vascin-cover-images/')) {
    candidates.push(new URL(target.href.replace('/vascin-cover-images/', '/vascin-poster-images/')));
  }

  try {
    for (const candidate of candidates) {
      const cached = getCachedImage(candidate.href);
      if (cached) return responseFromCachedImage(cached, 'HIT');
    }

    let lastError: unknown = null;
    for (const delayMs of RETRY_DELAYS_MS) {
      await waitForRetry(delayMs, controller.signal);
      for (const candidate of candidates) {
        try {
          const response = await fetchWithRedirects(candidate.href, headers, 5, controller.signal);
          const image = await readValidImage(response);
          if (!image) continue;
          cacheImage(candidate.href, image);
          return responseFromCachedImage(image, 'MISS');
        } catch (error: unknown) {
          lastError = error;
          if (controller.signal.aborted) throw error;
        }
      }
    }

    if (Date.now() - imageCacheState.lastErrorLogAt > 30_000) {
      imageCacheState.lastErrorLogAt = Date.now();
      console.error('Image proxy exhausted retries:', lastError);
    }
    return placeholderResponse();
  } catch (error: unknown) {
    if (!(error instanceof Error && error.name === 'AbortError') && Date.now() - imageCacheState.lastErrorLogAt > 30_000) {
      imageCacheState.lastErrorLogAt = Date.now();
      console.error('Image proxy error:', error);
    }
    return placeholderResponse();
  } finally {
    clearTimeout(timeout);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
