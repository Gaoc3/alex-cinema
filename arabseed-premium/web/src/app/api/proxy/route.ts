import { NextRequest, NextResponse } from 'next/server';
import { TUNNEL_BASE_URL } from '@/lib/config';

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

  const isCinemana = targetUrl.includes('shabakaty.com');
  const finalFetchUrl = isCinemana ? `${TUNNEL_BASE_URL}${encodeURIComponent(targetUrl)}` : targetUrl;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(finalFetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `Tunnel returned ${response.status}` }, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Tunnel timeout' }, { status: 504 });
    }
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}