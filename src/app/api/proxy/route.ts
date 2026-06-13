import { NextRequest, NextResponse } from 'next/server';
import { encryptData } from '@/utils/cryptoHelper';
import { encryptPath } from '@/lib/serverCrypto';

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
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
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

const cacheStore = new Map<string, { data: any; expires: number }>();

function getCached(key: string, ttl: number) {
  const cached = cacheStore.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  cacheStore.delete(key);
  return null;
}

function setCache(key: string, data: any, ttl: number) {
  cacheStore.set(key, { data, expires: Date.now() + ttl });
  if (cacheStore.size > 500) {
    const oldest = cacheStore.entries().next().value;
    if (oldest) cacheStore.delete(oldest[0]);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
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
  const isVideo = isShabakaty && (targetUrl.includes('mp4') || targetUrl.includes('video'));
  const isSrt = targetUrl.toLowerCase().includes('.srt');

  const headers: Record<string, string> = {
    'User-Agent': ua,
    'Accept': isVideo ? 'video/mp4,video/*;q=0.9,*/*;q=0.8' : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://cinemana.shabakaty.com/',
  };
  const range = req.headers.get('range');
  if (range) headers['Range'] = range;

  let tunnelUrl = targetUrl;
  try {
    const tUrl = new URL(targetUrl);
    const tunnelBase = TUNNEL_BASE_URL.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    if (tunnelBase && tUrl.hostname.includes('shabakaty.com')) {
      tunnelUrl = `${tunnelBase}${tUrl.pathname}${tUrl.search}`;
    }
  } catch (e) { }

  // No debug headers — never leak internal URLs
  const debugHeaders = {};

  const cacheKey = isApi ? targetUrl : '';
  const cacheTtl = isApi ? 120000 : 0;

  if (cacheKey) {
    const cached = getCached(cacheKey, cacheTtl);
    if (cached) return buildEncryptedJsonResponse(cached, 200, debugHeaders);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  if (isImage) {
    // Try tunnel first with a short timeout
    const imgController = new AbortController();
    const imgTimeout = setTimeout(() => imgController.abort(), 8000);
    try {
      const upstreamRes = await fetch(tunnelUrl, { 
        headers: { ...headers, 'Bypass-Tunnel-Reminder': 'true' }, 
        method: 'GET', 
        redirect: 'follow',
        signal: imgController.signal
      });
      clearTimeout(imgTimeout);
      if (upstreamRes.ok || upstreamRes.status === 206) {
        const response = buildResponse(upstreamRes, debugHeaders);
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return response;
      }
    } catch { clearTimeout(imgTimeout); }

    // Fallback: try direct fetch
    const directImgController = new AbortController();
    const directImgTimeout = setTimeout(() => directImgController.abort(), 8000);
    try {
      const directRes = await fetch(targetUrl, {
        headers,
        method: 'GET',
        redirect: 'follow',
        signal: directImgController.signal
      });
      clearTimeout(directImgTimeout);
      if (directRes.ok || directRes.status === 206) {
        const response = buildResponse(directRes, debugHeaders);
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return response;
      }
    } catch { clearTimeout(directImgTimeout); }

    return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
  }

  try {
    const response = await fetchWithRetry(tunnelUrl, { headers: { ...headers, 'Bypass-Tunnel-Reminder': 'true' }, signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok || response.status === 206) {
      if (isApi) {
        try {
          let text = await response.text();
          // Hide Shabakaty domains — encrypt ONLY the path with server-only key
          text = text.replace(/https?:(?:\\?\/){2}(cdn|cnth[0-9]+|cndw[0-9]+|cinemana)\.shabakaty\.com([^"'\s]*)/g, (match) => {
            try {
              const unescapedMatch = match.replace(/\\/g, '');
              const parsed = new URL(unescapedMatch);
              const pathWithSearch = parsed.pathname + parsed.search;
              const enc = encryptPath(pathWithSearch);
              if (match.includes('mp4') || match.includes('video') || match.includes('m3u8') || match.includes('.ts')) {
                return `/api/stream?ref=${enc}`;
              }
              return `/tunnel${pathWithSearch}`;
            } catch {
              return match;
            }
          });
          
          const data = JSON.parse(text);
          setCache(cacheKey, data, cacheTtl);

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
    clearTimeout(timeout);
    // tunnel error – try direct fetch for non-media
  }

  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 30000);
  try {
    const response = await fetch(targetUrl, { headers, signal: directController.signal });
    clearTimeout(directTimeout);
    if (response.ok || response.status === 206) {
      if (isApi) {
        try {
          let text = await response.text();
          text = text.replace(/https?:(?:\\?\/){2}(cdn|cnth[0-9]+|cndw[0-9]+|cinemana)\.shabakaty\.com([^"'\s]*)/g, (match) => {
            try {
              const unescapedMatch = match.replace(/\\/g, '');
              const parsed = new URL(unescapedMatch);
              const pathWithSearch = parsed.pathname + parsed.search;
              const enc = encryptPath(pathWithSearch);
              if (match.includes('mp4') || match.includes('video') || match.includes('m3u8') || match.includes('.ts')) {
                return `/api/stream?ref=${enc}`;
              }
              return `/tunnel${pathWithSearch}`;
            } catch {
              return match;
            }
          });
          
          const data = JSON.parse(text);
          setCache(cacheKey, data, cacheTtl);

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
