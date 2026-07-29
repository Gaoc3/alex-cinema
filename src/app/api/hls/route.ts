import { NextRequest, NextResponse } from 'next/server';
import { decryptPath, encryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects, readResponseTextWithLimit } from '@/utils/proxyHelper';
import { isHlsUrl, parseAllowedShabakatyUrl, resolveShabakatyReference } from '@/utils/shabakatyUrl';

function rewriteHlsUri(uri: string, manifestUrl: string): string {
  // If it's already rewritten or empty, return as is
  if (!uri || uri.startsWith('/tunnel-video/') || uri.startsWith('/api/')) return uri;

  try {
    let resolved: URL;
    // 1. If it's already an absolute URL
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      resolved = new URL(uri);
    } else {
      // 2. If it's relative, resolve against manifest URL
      resolved = new URL(uri, manifestUrl);
    }

    const approved = parseAllowedShabakatyUrl(resolved.href);
    if (!approved) return '';
    const fullUrl = approved.href;
    const encrypted = encryptPath(fullUrl);

    if (isHlsUrl(fullUrl)) {
      return `/api/hls?ref=${encrypted}`;
    } else {
      return `/api/tunnel-video?ref=${encrypted}`;
    }
  } catch (e) {
    console.error('Error rewriting HLS URI:', uri, e);
    return uri;
  }
}

function rewriteLine(line: string, manifestUrl: string): string {
  // 1. If it's a comment or tag line
  if (line.startsWith('#')) {
    // Look for URI="xxx" pattern inside tags like #EXT-X-KEY or #EXT-X-MAP
    return line.replace(/URI="([^"]+)"/g, (match, uri) => {
      const rewritten = rewriteHlsUri(uri, manifestUrl);
      return `URI="${rewritten}"`;
    });
  }

  // 2. If it's a URI line (and not empty)
  const trimmed = line.trim();
  if (trimmed.length === 0) return line;

  return rewriteHlsUri(trimmed, manifestUrl);
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) {
    return new NextResponse('Missing ref parameter', { status: 400 });
  }

  const decrypted = decryptPath(ref);
  if (!decrypted) {
    return new NextResponse('Invalid ref parameter', { status: 400 });
  }

  const target = resolveShabakatyReference(decrypted);
  if (!target || !isHlsUrl(target.href)) {
    return new NextResponse('Invalid HLS reference', { status: 400 });
  }
  const targetUrl = target.href;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const headers = new Headers({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Bypass-Tunnel-Reminder': 'true',
        'Referer': 'https://cinemana.shabakaty.com/',
    });
    const res = await fetchWithRedirects(targetUrl, headers, 5, controller.signal);

    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      return new NextResponse(`HLS manifest fetch failed: ${res.status}`, { status: 502 });
    }

    const text = await readResponseTextWithLimit(res, 5 * 1024 * 1024);
    
    // Process and rewrite the manifest
    const manifestUrl = parseAllowedShabakatyUrl(res.url)?.href || targetUrl;
    const manifestLines = text.split('\n');
    const rewrittenLines = manifestLines.map(line => rewriteLine(line, manifestUrl));
    const rewrittenManifest = rewrittenLines.join('\n');

    return new NextResponse(rewrittenManifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: unknown) {
    console.error('Error in /api/hls:', error);
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    return new NextResponse(`HLS route error: ${message}`, { status: 502 });
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
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Max-Age': '86400',
    },
  });
}
