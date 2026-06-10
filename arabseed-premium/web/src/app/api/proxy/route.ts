import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'https://mtskycinemana.serveousercontent.com/cgi-bin/proxy?url=';

function buildResponse(upstreamRes: Response) {
  const headers = new Headers();
  const contentType = upstreamRes.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const contentLength = upstreamRes.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);
  const contentRange = upstreamRes.headers.get('content-range');
  if (contentRange) headers.set('Content-Range', contentRange);
  const acceptRanges = upstreamRes.headers.get('accept-ranges');
  if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

  return new NextResponse(upstreamRes.body as any, {
    status: upstreamRes.status,
    headers,
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

  const headers: Record<string, string> = {
    'User-Agent': ua,
    'Accept': isVideo ? 'video/mp4,video/*;q=0.9,*/*;q=0.8' : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://cinemana.shabakaty.com/',
  };
  const range = req.headers.get('range');
  if (range) headers['Range'] = range;

  let tunnelUrl = `${TUNNEL_BASE_URL}${encodeURIComponent(targetUrl)}`;
  if (range) tunnelUrl += '&range=' + encodeURIComponent(range);

  const cacheKey = isApi ? targetUrl : '';
  const cacheTtl = isApi ? 120000 : 0;

  if (cacheKey) {
    const cached = getCached(cacheKey, cacheTtl);
    if (cached) return buildResponse(new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  if (isImage) {
    let upstreamRes = await fetchWithRetry(tunnelUrl, { headers: { ...headers, 'Bypass-Tunnel-Reminder': 'true' }, method: 'GET', redirect: 'follow' }, 1);
    const response = buildResponse(upstreamRes);
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return response;
  }

  try {
    const response = await fetchWithRetry(tunnelUrl, { headers: { ...headers, 'Bypass-Tunnel-Reminder': 'true' }, signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok || response.status === 206) {
      if (isApi) {
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        if (data) setCache(cacheKey, data, cacheTtl);
      }
      return buildResponse(response);
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
    if (response.ok || response.status === 206) return buildResponse(response);
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
