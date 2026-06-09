import { NextRequest, NextResponse } from 'next/server';
import { TUNNEL_BASE_URL } from '@/lib/config';

async function fetchWithTimeout(url: string, signal: AbortSignal, isTunnel: boolean) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    signal,
  });
  return res;
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
  const tunnelUrl = isShabakaty ? `${TUNNEL_BASE_URL}${encodeURIComponent(targetUrl)}` : targetUrl;

  // Try tunnel first with 20s timeout
  const tunnelController = new AbortController();
  const tunnelTimeout = setTimeout(() => tunnelController.abort(), 20000);

  try {
    const response = await fetchWithTimeout(tunnelUrl, tunnelController.signal, true);
    clearTimeout(tunnelTimeout);

    if (response.ok) {
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    console.log(`Tunnel returned ${response.status}, trying direct...`);
  } catch (e: any) {
    clearTimeout(tunnelTimeout);
    if (e.name !== 'AbortError') console.log('Tunnel error:', e.message);
  }

  // Fallback: direct fetch (works from this server's IP)
  const directController = new AbortController();
  const directTimeout = setTimeout(() => directController.abort(), 25000);

  try {
    const response = await fetchWithTimeout(targetUrl, directController.signal, false);
    clearTimeout(directTimeout);

    if (response.ok) {
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    return NextResponse.json({ error: `Direct fetch failed: ${response.status}` }, { status: response.status });
  } catch (e: any) {
    clearTimeout(directTimeout);
    if (e.name === 'AbortError') {
      return NextResponse.json({ error: 'Both tunnel and direct fetch timed out' }, { status: 504 });
    }
    console.error('Proxy error:', e);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}