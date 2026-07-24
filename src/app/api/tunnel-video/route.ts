import { NextRequest, NextResponse } from 'next/server';
import { decryptPath } from '@/lib/serverCrypto';
import { fetchWithRedirects } from '@/utils/proxyHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ref = searchParams.get('ref');

    if (!ref) {
      return new NextResponse('Missing ref', { status: 400 });
    }

    const decrypted = decryptPath(ref);
    if (!decrypted) {
      console.log('tunnel-video 400: Invalid ref (decrypt failed)', ref);
      return new NextResponse('Invalid ref', { status: 400 });
    }

    // The decrypted string MUST INCLUDE THE SUBDOMAIN
    // Example: /cndwX/path/to/video.mp4
    const parts = decrypted.split('/').filter(Boolean);
    if (parts.length < 2) {
      console.log('tunnel-video 400: Invalid decrypted path format', decrypted);
      return new NextResponse('Invalid decrypted path format', { status: 400 });
    }

    // We need to fetch the video through the SSH tunnel, passing the Range header.
    // By using fetch() in Node.js, we automatically follow any 302 redirects from the CDN,
    // so the browser never sees the redirect and the URL remains /api/tunnel-video!
    const subdomain = parts[0];
    const pathAndQuery = decrypted.substring(subdomain.length + 1); // e.g. /vascin24...
    const internalUrl = `https://${subdomain}.shabakaty.com${pathAndQuery}`;
    
    const fetchHeaders = new Headers();
    if (request.headers.has('range')) {
      fetchHeaders.set('range', request.headers.get('range')!);
    }
    fetchHeaders.set('Bypass-Tunnel-Reminder', 'true');
    fetchHeaders.set('Referer', 'https://cinemana.shabakaty.com/');
    fetchHeaders.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const response = await fetchWithRedirects(internalUrl, fetchHeaders);

    if (!response.ok && response.status !== 206) {
      console.error(`Tunnel Video Proxy failed with status: ${response.status}`, response.url);
      return new NextResponse(`Proxy error: ${response.status}`, { status: response.status });
    }

    const responseHeaders = new Headers();
    // Copy essential media headers back to the browser
    const headersToKeep = [
      'content-type',
      'content-length',
      'accept-ranges',
      'content-range',
      'cache-control'
    ];
    
    headersToKeep.forEach(h => {
      if (response.headers.has(h)) {
        responseHeaders.set(h, response.headers.get(h)!);
      }
    });
    
    // Add aggressive caching headers for the browser
    responseHeaders.set('Cache-Control', 'public, max-age=2592000, immutable');

    // Return the response body directly as a stream. 
    // Next.js App Router natively handles ReadableStream backpressure.
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Tunnel Video Proxy Error:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
