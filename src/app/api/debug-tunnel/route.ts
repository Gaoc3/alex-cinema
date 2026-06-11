import { encodeProxyUrl } from '@/utils/proxyHelper';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const tunnelBase = process.env.TUNNEL_BASE_URL || 'NOT SET';
  
  if (!process.env.TUNNEL_BASE_URL) {
    return NextResponse.json({ error: 'TUNNEL_BASE_URL not set' }, { status: 500 });
  }

  const targetUrl = 'https://cinemana.shabakaty.com/api/android/ar/video/info/20512';
  const finalUrl = `${tunnelBase}${encodeProxyUrl(targetUrl)}`;

  try {
    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)'
      },
      signal: req.signal
    });

    return NextResponse.json({
      tunnelBase: tunnelBase.substring(0, 50),
      responseStatus: response.status,
      responseOk: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      bodyLength: (await response.text()).length,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      name: error.name,
      cause: error.cause?.message,
      stack: error.stack?.substring(0, 500),
    }, { status: 500 });
  }
}
