import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE_URL = 'https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=';

async function fetchDirect(url: string, signal: AbortSignal) {
  return fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    signal,
  });
}

async function fetchTunnel(targetUrl: string, signal: AbortSignal) {
  const tunnelUrl = `${TUNNEL_BASE_URL}${encodeURIComponent(targetUrl)}`;
  return fetch(tunnelUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    signal,
  });
}

export async function GET(req: NextRequest) {
  const searchParams = new URLSearchParams(req.nextUrl.searchParams);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  let targetUrl = '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    targetUrl = endpoint;
  } else {
    targetUrl = `https://cinemana.shabakaty.com/api/android/${endpoint}`;
  }

  searchParams.delete('endpoint');
  const queryStr = searchParams.toString();
  if (queryStr) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryStr;
  }

  const isShabakaty = targetUrl.includes('shabakaty.com');

  // Direct fetch FIRST (works from Windows IP)
  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 25000);

  try {
    const response = await fetchDirect(targetUrl, directController.signal);
    clearTimeout(directTimeout);

    if (response.ok) {
      const text = await response.text();
      return new NextResponse(text, {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    console.log(`Direct returned ${response.status}, trying tunnel...`);
  } catch (e: any) {
    clearTimeout(directTimeout);
    if (e.name !== 'AbortError') console.log('Direct error:', e.message);
  }

  // Fallback: tunnel (only for shabakaty.com)
  if (isShabakaty) {
    const tunnelController = new AbortController();
    const tunnelTimeout = setTimeout(() => tunnelController.abort(), 20000);

    try {
      const response = await fetchTunnel(targetUrl, tunnelController.signal);
      clearTimeout(tunnelTimeout);

      if (response.ok) {
        const text = await response.text();
        return new NextResponse(text, {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
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