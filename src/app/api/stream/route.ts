import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'http://64.225.99.144';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const urlParam = req.nextUrl.searchParams.get('url');

  let subtitleUrl = '';

  if (ref) {
    const dec = decryptPath(ref);
    if (dec) {
      if (dec.startsWith('http')) {
        subtitleUrl = dec;
      } else {
        const parts = dec.split('/').filter(Boolean);
        if (parts.length >= 2) {
          subtitleUrl = `https://${parts[0]}.shabakaty.com/${parts.slice(1).join('/')}`;
        }
      }
    }
  } else if (urlParam) {
    if (urlParam.startsWith('http')) {
      subtitleUrl = urlParam;
    } else {
      try {
        const decoded = atob(urlParam);
        if (decoded.startsWith('http')) {
          subtitleUrl = decoded;
        }
      } catch { /* ignore */ }
    }
  }

  if (!subtitleUrl) return new NextResponse('Missing stream parameter', { status: 400 });

  const lowerPath = subtitleUrl.toLowerCase();
  const isSrt = lowerPath.includes('.srt');
  const isVtt = lowerPath.includes('.vtt');

  if (!isSrt && !isVtt) {
    return new NextResponse('Only subtitles are handled here', { status: 400 });
  }

  try {
    const res = await fetch(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Bypass-Tunnel-Reminder': 'true',
        'Referer': 'https://cinemana.shabakaty.com/',
      },
    });

    if (!res.ok) {
      return new NextResponse('Subtitle fetch failed', { status: 502 });
    }

    let text = await res.text();

    // Convert SRT to VTT format
    if (isSrt) {
      text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('Subtitle fetch failed', { status: 502 });
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