import { NextRequest, NextResponse } from 'next/server';
import { sanitizeUrl } from '@/lib/serverCrypto';

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file');
  if (!file) {
    return new NextResponse('Missing file parameter', { status: 400 });
  }

  const sanitized = sanitizeUrl(`https://cinemana.shabakaty.com/video/${file}`);
  
  // Use absolute URL for redirect to ensure it works correctly
  const redirectUrl = new URL(sanitized, req.nextUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
