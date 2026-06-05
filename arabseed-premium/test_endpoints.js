const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";

async function fetchCinemana(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
  const targetUrl = `https://cinemana.shabakaty.com/api/android/${fullEndpoint}`;
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(targetUrl)}`;
  const res = await fetch(tunnelUrl, {
    headers: {
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)'
    }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  const videoId = '3101066';
  
  // Test different endpoints that might return signed video URLs
  const endpoints = [
    ['transcodings/videos', { id: videoId }],
    ['transcodings', { id: videoId }],
    ['videoSources', { id: videoId }],
    ['videoFiles', { id: videoId }],
    ['videoStream', { id: videoId }],
    ['getStream', { id: videoId }],
    ['play', { id: videoId }],
    ['video/play', { id: videoId }],
    ['streams', { id: videoId }],
    ['videoSrc', { id: videoId }],
    ['allVideoInfo', { id: videoId }],
    ['transcodings/videos', { nb: videoId }],
    ['videoFiles', { nb: videoId }],
  ];

  for (const [endpoint, params] of endpoints) {
    const data = await fetchCinemana(endpoint, params);
    const preview = typeof data === 'string' ? data.substring(0, 100) : JSON.stringify(data).substring(0, 200);
    console.log(`${endpoint}: ${preview}`);
    console.log('---');
  }
}

run();
