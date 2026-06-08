import { NextRequest, NextResponse } from 'next/server';
import { TUNNEL_BASE_URL } from '@/lib/config';

function convertSrtToVtt(srtText: string): string {
  let content = srtText;
  if (content.startsWith('\ufeff')) {
    content = content.slice(1);
  }
  content = content.trim();
  if (content.startsWith('WEBVTT')) {
    return srtText;
  }
  // Replace line endings
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Replace comma with dot in timestamps: e.g. 00:01:20,123 --> 00:01:23,456
  content = content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  return 'WEBVTT\n\n' + content;
}

export async function GET(req: NextRequest) {
  const searchParams = new URLSearchParams(req.nextUrl.searchParams);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  // Remove endpoint parameter so we only forward the rest
  searchParams.delete('endpoint');

  let targetUrl = '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    targetUrl = endpoint;
  } else {
    targetUrl = `https://cinemana.shabakaty.com/api/android/${endpoint}`;
  }

  // Append other parameters to targetUrl if any exist
  const queryStr = searchParams.toString();
  if (queryStr) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryStr;
  }

  // Only tunnel media CDNs (images, video), not API endpoints
  const needsTunnel = /\.?cnth?2?\.shabakaty\.com|cndw2\.shabakaty\.com|cdn\.shabakaty\.com|contwatch\.shabakaty\.com/.test(targetUrl);
  const finalFetchUrl = needsTunnel ? `${TUNNEL_BASE_URL}${encodeURIComponent(targetUrl)}` : targetUrl;

  try {
    const response = await fetch(finalFetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
      signal: req.signal
    });

    if (!response.ok) {
      throw new Error(`Tunnel returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    if (contentType.startsWith('image/') || contentType.startsWith('video/') || contentType === 'application/octet-stream') {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Text-based responses (subtitles, etc.)
    const data = await response.text();
    let responseContentType = contentType || 'text/plain';
    let finalData = data;
    
    const lowerTarget = targetUrl.toLowerCase();
    const lowerEndpoint = endpoint.toLowerCase();
    
    if (lowerTarget.includes('.vtt') || lowerEndpoint.includes('.vtt')) {
      responseContentType = 'text/vtt';
    } else if (lowerTarget.includes('.srt') || lowerEndpoint.includes('.srt')) {
      responseContentType = 'text/vtt';
      finalData = convertSrtToVtt(data);
    }

    return new NextResponse(finalData, {
      headers: {
        'Content-Type': responseContentType,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    const errorStr = String(error);
    const isAbort = 
      error?.name === 'AbortError' || 
      error?.name === 'ResponseAborted' || 
      error?.message === 'ResponseAborted' ||
      errorStr.includes('Abort') ||
      errorStr.includes('aborted') ||
      errorStr.includes('ResponseAborted');

    if (isAbort) {
      return new NextResponse('Aborted', { status: 499 });
    }
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from proxy' }, { status: 500 });
  }
}
