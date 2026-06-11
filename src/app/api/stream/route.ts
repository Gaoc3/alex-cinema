import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com/cgi-bin/proxy?url=';



import { decryptUrl } from '@/utils/cryptoHelper';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  let urlStr = req.nextUrl.searchParams.get('url');

  if (!urlStr) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  // Support AES encrypted URLs to hide Shabakaty domains
  if (!urlStr.startsWith('http')) {
    try {
      const decrypted = decryptUrl(urlStr);
      if (decrypted && decrypted.startsWith('http')) {
        urlStr = decrypted;
      } else {
        // Fallback for old base64 cache if any
        const decodedB64 = Buffer.from(urlStr, 'base64').toString('utf-8');
        if (decodedB64.startsWith('http')) {
          urlStr = decodedB64;
        }
      }
    } catch (e) {
      return new NextResponse('Invalid encoded URL', { status: 400 });
    }
  }

  try {
    const targetUrl = new URL(urlStr);
    const tunnelBase = TUNNEL_BASE_URL.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    
    // Nginx on the router handles the path directly
    const proxyUrl = `${tunnelBase}${targetUrl.pathname}${targetUrl.search}`;
    
    // Fetch the stream from the tunnel
    const response = await fetch(proxyUrl, {
      headers: {
        'bypass-tunnel-reminder': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(req.headers.get('range') ? { range: req.headers.get('range')! } : {})
      }
    });

    // Extract headers to forward to the client
    const headers = new Headers();
    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
    ];

    headersToForward.forEach(headerName => {
      if (response.headers.has(headerName)) {
        headers.set(headerName, response.headers.get(headerName)!);
      }
    });

    // Force essential video streaming headers if missing
    headers.set('Accept-Ranges', 'bytes');
    
    // Fix Content-Type if it defaults to generic octet-stream for mp4
    if (urlStr.includes('.mp4') && headers.get('content-type') === 'binary/octet-stream') {
      headers.set('Content-Type', 'video/mp4');
    } else if (urlStr.includes('.m3u8')) {
      headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (urlStr.includes('.ts')) {
      headers.set('Content-Type', 'video/mp2t');
    }

    // Add CORS headers for the video player
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    
    // Stream the body directly to the client
    return new NextResponse(response.body, {
      status: response.status,
      headers
    });
  } catch (error: any) {
    console.error('Stream proxy error:', error?.message || error);
    return new NextResponse('Invalid URL or stream proxy failed', { status: 400 });
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