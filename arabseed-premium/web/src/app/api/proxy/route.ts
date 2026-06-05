import { NextRequest, NextResponse } from 'next/server';

const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";

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

  const isCinemana = targetUrl.includes('shabakaty.com');
  const finalFetchUrl = isCinemana ? `${TUNNEL_BASE}${encodeURIComponent(targetUrl)}` : targetUrl;

  try {
    const response = await fetch(finalFetchUrl, {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)'
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
    } else {
      // Direct raw response for subtitles (text/vtt) or other files
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
    }
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
