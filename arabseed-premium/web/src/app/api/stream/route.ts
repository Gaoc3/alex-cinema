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
    const redirectUrl = `${tunnelBase}${targetUrl.pathname}${targetUrl.search}`;
    
    return NextResponse.redirect(redirectUrl, 302);
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