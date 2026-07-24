import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects } from '@/utils/proxyHelper';

export const dynamic = 'force-dynamic';

const CDN_TYPE_MAP: Record<string, string> = {
  poster: '/vascin-poster-images/',
  cover: '/vascin-cover-images/',
};

function sanitizeFilename(file: string): string {
  return file.replace(/[^a-zA-Z0-9._-]/g, '');
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const file = searchParams.get('file');
    const ref = searchParams.get('ref');

    let path = '';

    if (ref) {
      const decrypted = decryptPath(ref);
      if (decrypted && decrypted.includes('/')) {
        path = decrypted;
      }
    }

    if (!path && file) {
      let rawFile = decodeURIComponent(file);
      if (rawFile.startsWith('http://') || rawFile.startsWith('https://')) {
        try {
          const parsed = new URL(rawFile);
          const subdomain = parsed.hostname.split('.')[0];
          path = `/${subdomain}${parsed.pathname}${parsed.search}`;
        } catch { /* fallback below */ }
      }

      if (!path) {
        const fileNameOnly = rawFile.split('/').pop() || rawFile;
        const safeFile = sanitizeFilename(fileNameOnly);
        if (safeFile) {
          let basePath = '/vascin-poster-images/';
          if (safeFile.includes('cover')) {
            basePath = '/vascin-cover-images/';
          } else if (safeFile.includes('poster')) {
            basePath = '/vascin-poster-images/';
          } else if (type === 'cover' || type === 'backdrop') {
            basePath = '/vascin-cover-images/';
          }
          path = `/cnth2${basePath}${safeFile}`;
        }
      }
    }

    if (!path && ref) {
      const rawRef = decodeURIComponent(ref);
      const fileNameOnly = rawRef.split('/').pop() || rawRef;
      const safeFile = sanitizeFilename(fileNameOnly);
      if (safeFile) {
        let basePath = '/vascin-poster-images/';
        if (safeFile.includes('cover')) {
          basePath = '/vascin-cover-images/';
        } else if (safeFile.includes('poster')) {
          basePath = '/vascin-poster-images/';
        } else if (type === 'cover' || type === 'backdrop') {
          basePath = '/vascin-cover-images/';
        }
        path = `/cnth2${basePath}${safeFile}`;
      }
    }

    if (!path) {
      return NextResponse.json({ error: 'Invalid or missing image parameters' }, { status: 400 });
    }

    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 });
    }

    const subdomain = parts[0];
    const pathAndQuery = path.substring(subdomain.length + 1);
    const internalUrl = `https://${subdomain}.shabakaty.com${pathAndQuery}`;

    const fetchHeaders = new Headers();
    fetchHeaders.set('Bypass-Tunnel-Reminder', 'true');
    fetchHeaders.set('Referer', 'https://cinemana.shabakaty.com/');
    fetchHeaders.set('User-Agent', req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const response = await fetchWithRedirects(internalUrl, fetchHeaders);

    if (!response.ok) {
      // 1. Try alternate image directory (poster vs cover)
      let altPath = '';
      if (path.includes('/vascin-poster-images/')) {
        altPath = path.replace('/vascin-poster-images/', '/vascin-cover-images/');
      } else if (path.includes('/vascin-cover-images/')) {
        altPath = path.replace('/vascin-cover-images/', '/vascin-poster-images/');
      }

      if (altPath) {
        const altUrl = `https://${subdomain}.shabakaty.com${altPath.substring(subdomain.length + 1)}`;
        try {
          const altResponse = await fetchWithRedirects(altUrl, fetchHeaders);
          if (altResponse.ok) {
            const responseHeaders = new Headers();
            const headersToKeep = ['content-type', 'content-length', 'cache-control'];
            headersToKeep.forEach(h => { if (altResponse.headers.has(h)) responseHeaders.set(h, altResponse.headers.get(h)!); });
            responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
            return new NextResponse(altResponse.body, { status: 200, headers: responseHeaders });
          }
        } catch { /* ignore */ }
      }

      // 2. Try cnth2 fallback if original subdomain was different
      if (subdomain !== 'cnth2') {
        const fallbackUrl = `https://cnth2.shabakaty.com${pathAndQuery}`;
        try {
          const fbResponse = await fetchWithRedirects(fallbackUrl, fetchHeaders);
          if (fbResponse.ok) {
            const responseHeaders = new Headers();
            const headersToKeep = ['content-type', 'content-length', 'cache-control'];
            headersToKeep.forEach(h => { if (fbResponse.headers.has(h)) responseHeaders.set(h, fbResponse.headers.get(h)!); });
            responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
            return new NextResponse(fbResponse.body, { status: 200, headers: responseHeaders });
          }
        } catch { /* ignore fallback error */ }
      }

      return NextResponse.json({ error: 'Image fetch failed' }, { status: response.status });
    }

    const responseHeaders = new Headers();
    const headersToKeep = ['content-type', 'content-length', 'cache-control'];
    headersToKeep.forEach(h => {
      if (response.headers.has(h)) {
        responseHeaders.set(h, response.headers.get(h)!);
      }
    });
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(response.body, {
      status: 200,
      headers: responseHeaders
    });
  } catch (error: any) {
    console.error('Image Proxy Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
