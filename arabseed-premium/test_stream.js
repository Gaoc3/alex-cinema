// Test the tunnel proxy for video streaming
const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";

async function run() {
  const videoUrl = "https://cndw2.shabakaty.com/m240/6CE1089D-35E9-CEFD-0029-75D8B1D1E91E_video.mkv";
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(videoUrl)}`;
  
  console.log("Testing video stream through tunnel...");
  console.log("URL:", tunnelUrl);
  
  try {
    const res = await fetch(tunnelUrl, {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)',
        'Range': 'bytes=0-1023'  // Request only first 1KB
      }
    });
    
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get('content-type'));
    console.log("Content-Length:", res.headers.get('content-length'));
    console.log("Content-Range:", res.headers.get('content-range'));
    console.log("Accept-Ranges:", res.headers.get('accept-ranges'));
    
    if (res.ok || res.status === 206) {
      const buffer = await res.arrayBuffer();
      console.log("Received bytes:", buffer.byteLength);
      console.log("SUCCESS! Video stream works through tunnel.");
    } else {
      const text = await res.text();
      console.log("FAILED! Body:", text.substring(0, 200));
    }
  } catch(e) {
    console.error("ERROR:", e.message);
  }
}

run();
