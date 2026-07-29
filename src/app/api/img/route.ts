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

function sanitizeFilename(file: string): string {
  return file.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 255);
}

function toImageResponse(response: Response) {
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!response.ok || !ALLOWED_IMAGE_TYPES.has(contentType)) return null;

  const responseHeaders = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  const contentLength = response.headers.get('content-length');
  if (contentLength) responseHeaders.set('Content-Length', contentLength);
  return new NextResponse(response.body, { status: 200, headers: responseHeaders });
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

  try {
    const candidates = [target];
    if (target.pathname.includes('/vascin-poster-images/')) {
      candidates.push(new URL(target.href.replace('/vascin-poster-images/', '/vascin-cover-images/')));
    } else if (target.pathname.includes('/vascin-cover-images/')) {
      candidates.push(new URL(target.href.replace('/vascin-cover-images/', '/vascin-poster-images/')));
    }

    for (const candidate of candidates) {
      const response = await fetchWithRedirects(candidate.href, headers, 5, controller.signal);
      const imageResponse = toImageResponse(response);
      if (imageResponse) return imageResponse;
      await response.body?.cancel().catch(() => undefined);
    }

    return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      console.error('Image proxy error:', error);
    }
    return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
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
