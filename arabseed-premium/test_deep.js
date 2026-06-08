const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

async function fetchRaw(fullUrl) {
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(fullUrl)}`;
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
  const fileFile = 'B2CFBE10-9C6A-7B72-1C51-9C2B702B8651_video.mkv';
  
  // Test 1: Maybe there's a signed video URL endpoint
  console.log("=== Test 1: Different API base paths ===");
  const apiPaths = [
    `https://cinemana.shabakaty.com/api/android/transcodings/videos/${videoId}`,
    `https://cinemana.shabakaty.com/api/android/transcodings/${videoId}`,
    `https://cinemana.shabakaty.com/api/v1/videoInfo?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/ios/videoInfo?id=${videoId}`,
    `https://cinemana.shabakaty.com/api/web/videoInfo?id=${videoId}`,
  ];
  
  for (const path of apiPaths) {
    const data = await fetchRaw(path);
    const preview = typeof data === 'string' ? data.substring(0, 150) : JSON.stringify(data).substring(0, 200);
    console.log(`${path.split('shabakaty.com')[1]}: ${preview}`);
    console.log('---');
  }
  
  // Test 2: Check if videoInfo has a fileFilePath (signed URL for video, like translationFilePath)
  console.log("\n=== Test 2: Full videoInfo inspection ===");
  const info = await fetchRaw(`https://cinemana.shabakaty.com/api/android/videoInfo?id=${videoId}`);
  if (typeof info === 'object') {
    // Look for any key containing 'file', 'url', 'stream', 'path', 'video', 'src'
    const interestingKeys = Object.keys(info).filter(k => 
      /file|url|stream|path|video|src|play|link|media|cdn|download/i.test(k)
    );
    console.log("Interesting keys:", interestingKeys);
    for (const k of interestingKeys) {
      console.log(`  ${k}: ${JSON.stringify(info[k]).substring(0, 200)}`);
    }
  }

  // Test 3: Try the video URL with the signed pattern from subtitles  
  console.log("\n=== Test 3: Try vascin-video-files pattern ===");
  const videoPatterns = [
    `https://cnth2.shabakaty.com/vascin-video-files/${fileFile}`,
    `https://cnth2.shabakaty.com/vascin-video/${fileFile}`,
    `https://cnth2.shabakaty.com/vascin-videos/${fileFile}`,
    `https://cndw2.shabakaty.com/vascin-video-files/${fileFile}`,
  ];
  
  for (const url of videoPatterns) {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9)' }
      });
      console.log(`${url.split('.com/')[1]}: ${res.status} ${res.headers.get('content-type') || ''}`);
    } catch(e) {
      console.log(`${url.split('.com/')[1]}: ERROR ${e.message}`);
    }
  }
}

run();
