const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";

async function fetchRaw(url) {
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(url)}`;
  const res = await fetch(tunnelUrl, {
    headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  const videoId = '3101066';
  
  // Test web API endpoints (not android)
  const tests = [
    `https://cinemana.shabakaty.com/api/web/videoInfo?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/web/video/${videoId}`,
    `https://cinemana.shabakaty.com/api/v1/video/${videoId}`,
    `https://cinemana.shabakaty.com/api/v2/video/${videoId}`,
    `https://cinemana.shabakaty.com/api/android/transcodings/videos/${videoId}`,
    `https://cinemana.shabakaty.com/api/android/allVideoInfo?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/android/videoDetail?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/android/videoStreams?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/android/getVideoUrl?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/android/videoPlay?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/android/videoLink?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/android/getVideo?id=${videoId}`,
  ];
  
  for (const url of tests) {
    const data = await fetchRaw(url);
    const short = url.split('.com')[1];
    if (data && data !== '' && typeof data === 'object') {
      // Look for anything that looks like a video URL
      const json = JSON.stringify(data);
      if (json.includes('http') || json.includes('.mp4') || json.includes('.m3u8') || json.includes('.mkv')) {
        console.log(`✅ ${short}: HAS URLS! ${json.substring(0, 300)}`);
      } else {
        console.log(`⚠️  ${short}: object, no URLs. Keys: ${Object.keys(data).join(', ')}`);
      }
    } else if (Array.isArray(data) && data.length > 0) {
      console.log(`✅ ${short}: array[${data.length}] ${JSON.stringify(data[0]).substring(0, 200)}`);
    } else {
      console.log(`❌ ${short}: empty or error`);
    }
  }
  
  // Also check: maybe the web version uses a completely different path
  console.log("\n=== Checking web video page source ===");
  const webPage = await fetchRaw(`https://cinemana.shabakaty.com/watch/${videoId}`);
  if (typeof webPage === 'string' && webPage.length > 100) {
    // Look for video URLs in the page source
    const videoUrlMatch = webPage.match(/https?:\/\/[^\s"']+\.(mp4|m3u8|mkv|webm)[^\s"']*/g);
    if (videoUrlMatch) {
      console.log("Found video URLs in page:", videoUrlMatch);
    } else {
      console.log("No video URLs in page source. Page length:", webPage.length);
    }
  }
}

run();
