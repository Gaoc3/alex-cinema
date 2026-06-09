import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE_URL = 'https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=';

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

export async function GET(req: NextRequest) {
  let endpoint = req.nextUrl.searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  // Handle double-encoding: if endpoint is still percent-encoded, decode it
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

  const isShabakaty = targetUrl.includes('shabakaty.com');
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Build headers for direct fetch (includes Range from client)
  const directHeaders: Record<string, string> = {
    'User-Agent': ua,
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://cinemana.shabakaty.com/',
  };
  const range = req.headers.get('range');
  if (range) directHeaders['Range'] = range;

  // Direct fetch
  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 25000);

  try {
    const response = await fetch(targetUrl, { headers: directHeaders, signal: directController.signal });
    clearTimeout(directTimeout);

    if (response.ok || response.status === 206) {
      return buildResponse(response);
    }
    console.log(`Direct returned ${response.status} for ${targetUrl.substring(0, 80)}`);
  } catch (e: any) {
    clearTimeout(directTimeout);
    if (e.name !== 'AbortError') console.log('Direct error:', e.message);
  }

  // Tunnel fallback (no Range - tunnel CGI likely doesn't support it)
  if (isShabakaty) {
    const tunnelUrl = `${TUNNEL_BASE_URL}${encodeURIComponent(targetUrl)}`;
    const tunnelController = new AbortController();
    const tunnelTimeout = setTimeout(() => tunnelController.abort(), 20000);

    try {
      const response = await fetch(tunnelUrl, {
        headers: { 'User-Agent': ua, 'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', 'Referer': 'https://cinemana.shabakaty.com/' },
        signal: tunnelController.signal,
      });
      clearTimeout(tunnelTimeout);

      if (response.ok || response.status === 206) {
        return buildResponse(response);
      }
      return NextResponse.json({ error: `Tunnel returned ${response.status}` }, { status: response.status });
    } catch (e: any) {
      clearTimeout(tunnelTimeout);
      if (e.name === 'AbortError') {
        return NextResponse.json({ error: 'Tunnel timeout' }, { status: 504 });
      }
    }
  }

  return NextResponse.json({ error: 'Both direct and tunnel failed' }, { status: 502 });
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
