import { NextRequest, NextResponse } from 'next/server';
import { encryptData } from '@/utils/cryptoHelper';
import { encryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects } from '@/utils/proxyHelper';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'http://64.225.99.144';

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

  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }

  return new NextResponse(overrideBody !== undefined ? overrideBody : (upstreamRes.body as any), {
    status: upstreamRes.status,
    headers,
  });
}

async function handleSrtResponse(response: Response, debugHeaders: Record<string, string>) {
  try {
    const srtText = await response.text();
    // Convert SRT to VTT format (replace commas with dots in timestamps and add WEBVTT header)
    const vttText = 'WEBVTT\n\n' + srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    const res = buildResponse(response, debugHeaders, vttText, 'text/vtt; charset=utf-8');
    res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res;
  } catch (e) {
    return buildResponse(response, debugHeaders);
  }
}

function buildEncryptedJsonResponse(data: any, status = 200, extraHeaders?: Record<string, string>) {
  const encryptedPayload = encryptData(data);
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
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
      const headers = new Headers(options.headers as any);
      const res = await fetchWithRedirects(url, headers);
      if (res.ok || res.status === 206) return res;
      if (res.status === 502 && i < retries - 1) {
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
  let endpoint = req.nextUrl.searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  // URL-decode the endpoint (client now sends encodeURIComponent instead of AES)
  try {
    endpoint = decodeURIComponent(endpoint);
  } catch { /* not valid percent-encoding, keep as-is */ }

  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    try {
      const decoded = decodeURIComponent(endpoint);
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        endpoint = decoded;
      }
    } catch { /* not valid percent-encoding, keep as-is */ }
  }

  let targetUrl = '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    targetUrl = endpoint;
  } else {
    targetUrl = `https://cinemana.shabakaty.com/api/android/${endpoint}`;
  }

  const params = new URLSearchParams(req.nextUrl.searchParams);
  params.delete('endpoint');
  const queryStr = params.toString();
  if (queryStr) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryStr;
  }
  
  try {
    targetUrl = new URL(targetUrl).href;
  } catch (e) {
    // fallback if invalid URL
  }

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const isShabakaty = targetUrl.includes('shabakaty.com');
  const isApi = isShabakaty && targetUrl.includes('/api/');
  const isImage = isShabakaty && !isApi && (targetUrl.includes('poster') || targetUrl.includes('cover') || targetUrl.includes('.jpg') || targetUrl.includes('.png') || targetUrl.includes('.webp'));
  const isVideo = isShabakaty && (targetUrl.includes('mp4') || targetUrl.includes('video') || targetUrl.includes('cndw') || targetUrl.includes('/vascin'));
  const isSrt = targetUrl.toLowerCase().includes('.srt');

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
    // Try tunnel first with a short timeout
    const imgHeaders = new Headers({ ...headers, 'Bypass-Tunnel-Reminder': 'true' });
    try {
      const upstreamRes = await fetchWithRedirects(tunnelUrl, imgHeaders);
      if (upstreamRes.ok || upstreamRes.status === 206) {
        const response = buildResponse(upstreamRes, debugHeaders);
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return response;
      }
    } catch { /* ignore */ }

    // Fallback: try direct fetch
    const directImgHeaders = new Headers(headers);
    try {
      const directRes = await fetchWithRedirects(targetUrl, directImgHeaders);
      if (directRes.ok || directRes.status === 206) {
        const response = buildResponse(directRes, debugHeaders);
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return response;
      }
    } catch { /* ignore */ }

    return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
  }

  try {
    const response = await fetchWithRetry(tunnelUrl, { headers: { ...headers, 'Bypass-Tunnel-Reminder': 'true' }, signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok || response.status === 206) {
      if (isApi) {
        try {
          let text = await response.text();
          text = text.replace(/https?:(?:\\?\/){2}([a-zA-Z0-9_-]+)\.shabakaty\.com([^"'\s]*)/g, (match, subdomain) => {
            try {
              const unescapedMatch = match.replace(/\\/g, '');
              const parsed = new URL(unescapedMatch);
              const finalSubdomain = subdomain;

              const pathWithSearch = `/${finalSubdomain}${parsed.pathname}${parsed.search}`;
              const enc = encryptPath(pathWithSearch);
              const isSub = parsed.pathname.endsWith('.srt') || parsed.pathname.endsWith('.vtt') || parsed.pathname.includes('/subtitle/');
              const isVideo = subdomain.startsWith('cndw') || parsed.pathname.includes('/vascin24/') || parsed.pathname.includes('/vascin/') || parsed.pathname.includes('/video/') || parsed.pathname.endsWith('.mp4') || parsed.pathname.endsWith('.m3u8') || parsed.pathname.endsWith('.ts') || parsed.pathname.endsWith('.mkv');
              
              if (isSub) {
                return `/api/stream?ref=${enc}`;
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
        } catch (err) {
          return buildResponse(response, debugHeaders);
        }
      }
      if (isSrt) return await handleSrtResponse(response, debugHeaders);
      return buildResponse(response, debugHeaders);
    }
    // tunnel failed – try direct fetch for non-media
  } catch (e: any) {
    console.error("fetchWithRetry tunnel error:", e.message || e);
    clearTimeout(timeout);
    // tunnel error – try direct fetch for non-media
  }

  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 30000);
  try {
    const directHeaders = new Headers(headers);
    const response = await fetchWithRedirects(targetUrl, directHeaders);
    clearTimeout(directTimeout);
    if (response.ok || response.status === 206) {
      if (isApi) {
        try {
          let text = await response.text();
          text = text.replace(/https?:(?:\\?\/){2}([a-zA-Z0-9_-]+)\.shabakaty\.com([^"'\s]*)/g, (match, subdomain) => {
            try {
              const unescapedMatch = match.replace(/\\/g, '');
              const parsed = new URL(unescapedMatch);
              const finalSubdomain = subdomain;

              const pathWithSearch = `/${finalSubdomain}${parsed.pathname}${parsed.search}`;
              const enc = encryptPath(pathWithSearch);
              const isSub = parsed.pathname.endsWith('.srt') || parsed.pathname.endsWith('.vtt') || parsed.pathname.includes('/subtitle/');
              const isVideo = subdomain.startsWith('cndw') || parsed.pathname.includes('/vascin24/') || parsed.pathname.includes('/vascin/') || parsed.pathname.includes('/video/') || parsed.pathname.endsWith('.mp4') || parsed.pathname.endsWith('.m3u8') || parsed.pathname.endsWith('.ts') || parsed.pathname.endsWith('.mkv');
              
              if (isSub) {
                return `/api/stream?ref=${enc}`;
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
        } catch (err) {
          return buildResponse(response, debugHeaders);
        }
      }
      if (isSrt) return await handleSrtResponse(response, debugHeaders);
      return buildResponse(response, debugHeaders);
    }
  } catch { clearTimeout(directTimeout); }

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
