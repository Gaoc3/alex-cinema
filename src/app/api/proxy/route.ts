import { NextRequest, NextResponse } from 'next/server';
import { encryptData } from '@/utils/cryptoHelper';
import { encryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects, readResponseTextWithLimit } from '@/utils/proxyHelper';
import { parseAllowedShabakatyUrl } from '@/utils/shabakatyUrl';

const CINEMANA_API_BASE = 'https://cinemana.shabakaty.com/api/android/';

function buildResponse(upstreamRes: Response, extraHeaders?: Record<string, string>, overrideBody?: string, overrideContentType?: string) {
  const headers = new Headers();
  const contentType = overrideContentType || upstreamRes.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const contentLength = upstreamRes.headers.get('content-length');
  if (contentLength && !overrideBody) headers.set('Content-Length', contentLength);
  const contentRange = upstreamRes.headers.get('content-range');
  if (contentRange && !overrideBody) headers.set('Content-Range', contentRange);
  const acceptRanges = upstreamRes.headers.get('accept-ranges');
  if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  headers.set('X-Content-Type-Options', 'nosniff');

  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }

  return new NextResponse(overrideBody !== undefined ? overrideBody : upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  });
}

async function handleSrtResponse(response: Response, debugHeaders: Record<string, string>) {
  try {
    const srtText = await readResponseTextWithLimit(response, 5 * 1024 * 1024);
    // Convert SRT to VTT format (replace commas with dots in timestamps and add WEBVTT header)
    const vttText = 'WEBVTT\n\n' + srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    const res = buildResponse(response, debugHeaders, vttText, 'text/vtt; charset=utf-8');
    res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res;
  } catch {
    return new NextResponse('Subtitle response is invalid', { status: 502 });
  }
}

function buildEncryptedJsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  const encryptedPayload = encryptData(data);
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600', // CACHE BUSTER 1
  });
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }
  return new NextResponse(JSON.stringify({ payload: encryptedPayload }), {
    status,
    headers
  });
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const headers = new Headers(options.headers);
      const res = await fetchWithRedirects(url, headers, 5, options.signal || undefined);
      if (res.ok || res.status === 206) return res;
      if (res.status === 502 && i < retries - 1) {
        await res.body?.cancel().catch(() => undefined);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw new Error('Tunnel unreachable after retries');
    }
  }
  throw new Error('Tunnel unreachable after retries');
}

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  if (
    endpoint.length > 2048
    || endpoint.startsWith('/')
    || endpoint.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(endpoint)
    || /^[a-z][a-z\d+.-]*:/i.test(endpoint)
  ) {
    return NextResponse.json({ error: 'Invalid endpoint parameter' }, { status: 400 });
  }

  const target = parseAllowedShabakatyUrl(new URL(endpoint, CINEMANA_API_BASE).href);
  const base = new URL(CINEMANA_API_BASE);
  if (
    !target
    || target.origin !== base.origin
    || !target.pathname.startsWith(base.pathname)
    || target.pathname === base.pathname
  ) {
    return NextResponse.json({ error: 'Upstream host is not allowed' }, { status: 400 });
  }

  const params = new URLSearchParams(req.nextUrl.searchParams);
  params.delete('endpoint');
  for (const [key, value] of params) {
    target.searchParams.append(key, value);
  }

  const targetUrl = target.href;

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const lowerPath = target.pathname.toLowerCase();
  const isApi = lowerPath.includes('/api/');
  const isImage = !isApi && (lowerPath.includes('poster') || lowerPath.includes('cover') || /\.(?:jpe?g|png|webp)$/.test(lowerPath));
  const isVideo = /\.(?:mp4|m3u8|ts|mkv)$/.test(lowerPath) || lowerPath.includes('/video/') || target.hostname.startsWith('cndw') || lowerPath.includes('/vascin');
  const isSrt = lowerPath.endsWith('.srt');

  const headers: Record<string, string> = {
    'User-Agent': ua,
    'Accept': isVideo ? 'video/mp4,video/*;q=0.9,*/*;q=0.8' : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://cinemana.shabakaty.com/',
  };
  
  const range = req.headers.get('range');
  if (range) headers['Range'] = range;


  // tunnelUrl == targetUrl. /etc/hosts on VPS routes shabakaty.com → 127.0.0.1:443 (router SSH reverse tunnel)
  const tunnelUrl = targetUrl;


  // No debug headers — never leak internal URLs
  const debugHeaders = {};

  // No cache logic here - VPS NGINX handles it automatically

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  if (isImage) {
    try {
      const imgHeaders = new Headers({ ...headers, 'Bypass-Tunnel-Reminder': 'true' });
      try {
        const upstreamRes = await fetchWithRedirects(tunnelUrl, imgHeaders, 5, controller.signal);
        if (upstreamRes.ok || upstreamRes.status === 206) {
          const response = buildResponse(upstreamRes, debugHeaders);
          response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          return response;
        }
      } catch { /* try the fallback below */ }

      const directImgHeaders = new Headers(headers);
      try {
        const directRes = await fetchWithRedirects(targetUrl, directImgHeaders, 5, controller.signal);
        if (directRes.ok || directRes.status === 206) {
          const response = buildResponse(directRes, debugHeaders);
          response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          return response;
        }
      } catch { /* handled by the 502 response */ }

      return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    const response = await fetchWithRetry(tunnelUrl, { headers: { ...headers, 'Bypass-Tunnel-Reminder': 'true' }, signal: controller.signal });
    if (response.ok || response.status === 206) {
      if (isApi) {
        try {
          let text = await readResponseTextWithLimit(response, 10 * 1024 * 1024);
          text = text.replace(/https?:(?:\\?\/){2}([a-zA-Z0-9_-]+)\.shabakaty\.com([^"'\s]*)/g, (match, subdomain) => {
            try {
              const unescapedMatch = match.replace(/\\/g, '');
              const parsed = parseAllowedShabakatyUrl(unescapedMatch);
              if (!parsed) return match;
              const finalSubdomain = subdomain;

              const pathWithSearch = `/${finalSubdomain}${parsed.pathname}${parsed.search}`;
              const isHls = parsed.pathname.endsWith('.m3u8');
              const enc = encryptPath(isHls ? parsed.href : pathWithSearch);
              const isSub = parsed.pathname.endsWith('.srt') || parsed.pathname.endsWith('.vtt') || parsed.pathname.includes('/subtitle/');
               const isVideo = subdomain.startsWith('cndw') || parsed.pathname.includes('/vascin24/') || parsed.pathname.includes('/vascin/') || parsed.pathname.includes('/video/') || parsed.pathname.endsWith('.mp4') || parsed.pathname.endsWith('.ts') || parsed.pathname.endsWith('.mkv');
              
               if (isSub) {
                 return `/api/stream?ref=${enc}`;
               }
               if (isHls) {
                 return `/api/hls?ref=${enc}`;
               }
              if (isVideo) {
                return `/api/tunnel-video?ref=${enc}`;
              }
              return `/api/img?ref=${enc}`;
            } catch {
              return match;
            }
          });
          
          const data = JSON.parse(text);
          

          return buildEncryptedJsonResponse(data, response.status, debugHeaders);
        } catch {
          return NextResponse.json({ error: 'Invalid upstream API response' }, { status: 502 });
        }
      }
      if (isSrt) return await handleSrtResponse(response, debugHeaders);
      return buildResponse(response, debugHeaders);
    }
    await response.body?.cancel().catch(() => undefined);
    // tunnel failed – try direct fetch for non-media
  } catch (error: unknown) {
    console.error('fetchWithRetry tunnel error:', error instanceof Error ? error.message : error);
    // tunnel error – try direct fetch for non-media
  } finally {
    clearTimeout(timeout);
  }

  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 30000);
  try {
    const directHeaders = new Headers(headers);
    const response = await fetchWithRedirects(targetUrl, directHeaders, 5, directController.signal);
    if (response.ok || response.status === 206) {
      if (isApi) {
        try {
          let text = await readResponseTextWithLimit(response, 10 * 1024 * 1024);
          text = text.replace(/https?:(?:\\?\/){2}([a-zA-Z0-9_-]+)\.shabakaty\.com([^"'\s]*)/g, (match, subdomain) => {
            try {
              const unescapedMatch = match.replace(/\\/g, '');
              const parsed = parseAllowedShabakatyUrl(unescapedMatch);
              if (!parsed) return match;
              const finalSubdomain = subdomain;

              const pathWithSearch = `/${finalSubdomain}${parsed.pathname}${parsed.search}`;
              const isHls = parsed.pathname.endsWith('.m3u8');
              const enc = encryptPath(isHls ? parsed.href : pathWithSearch);
              const isSub = parsed.pathname.endsWith('.srt') || parsed.pathname.endsWith('.vtt') || parsed.pathname.includes('/subtitle/');
              const isVideo = subdomain.startsWith('cndw') || parsed.pathname.includes('/vascin24/') || parsed.pathname.includes('/vascin/') || parsed.pathname.includes('/video/') || parsed.pathname.endsWith('.mp4') || parsed.pathname.endsWith('.ts') || parsed.pathname.endsWith('.mkv');
              
              if (isSub) {
                return `/api/stream?ref=${enc}`;
              }
              if (isHls) {
                return `/api/hls?ref=${enc}`;
              }
              if (isVideo) {
                return `/api/tunnel-video?ref=${enc}`;
              }
              return `/api/img?ref=${enc}`;
            } catch {
              return match;
            }
          });
          
          const data = JSON.parse(text);
          

          return buildEncryptedJsonResponse(data, response.status, debugHeaders);
        } catch {
          return NextResponse.json({ error: 'Invalid upstream API response' }, { status: 502 });
        }
      }
      if (isSrt) return await handleSrtResponse(response, debugHeaders);
      return buildResponse(response, debugHeaders);
    }
    await response.body?.cancel().catch(() => undefined);
  } catch {
    // handled by the 502 response below
  } finally {
    clearTimeout(directTimeout);
  }

  return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 });
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
