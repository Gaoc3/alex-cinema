import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects, readResponseTextWithLimit } from '@/utils/proxyHelper';
import { resolveShabakatyReference } from '@/utils/shabakatyUrl';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) return new NextResponse('Missing stream parameter', { status: 400 });

  const approvedUrl = resolveShabakatyReference(decryptPath(ref));
  if (!approvedUrl) return new NextResponse('Invalid stream reference', { status: 400 });

  const lowerPath = approvedUrl.pathname.toLowerCase();
  const isSrt = lowerPath.endsWith('.srt');
  const isVtt = lowerPath.endsWith('.vtt');

  if (!isSrt && !isVtt) {
    return new NextResponse('Only subtitles are handled here', { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const headers = new Headers({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Bypass-Tunnel-Reminder': 'true',
        'Referer': 'https://cinemana.shabakaty.com/',
    });
    const res = await fetchWithRedirects(approvedUrl.href, headers, 5, controller.signal);

    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      return new NextResponse('Subtitle fetch failed', { status: 502 });
    }

    let text = await readResponseTextWithLimit(res, 5 * 1024 * 1024);

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
  } finally {
    clearTimeout(timeout);
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
