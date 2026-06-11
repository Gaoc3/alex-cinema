import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE_URL = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com/cgi-bin/proxy?url=';



export async function GET(req: NextRequest) {
  const urlStr = req.nextUrl.searchParams.get('url');

  if (!urlStr) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    const targetUrl = new URL(urlStr);
    const tunnelBase = TUNNEL_BASE_URL.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    
    // Construct the Nginx proxy path
    // e.g., https://cinemanamtsky001.serveousercontent.com/vascin24-mp4/...
    const proxyUrl = `${tunnelBase}${targetUrl.pathname}${targetUrl.search}`;
    
    // Fetch the stream from the tunnel
    const response = await fetch(proxyUrl, {
      headers: {
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