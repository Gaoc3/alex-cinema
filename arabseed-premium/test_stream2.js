// Test the tunnel proxy for video streaming - larger chunk
const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

async function run() {
  const videoUrl = "https://cndw2.shabakaty.com/m240/6CE1089D-35E9-CEFD-0029-75D8B1D1E91E_video.mkv";
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(videoUrl)}`;
  
  console.log("Test 1: Fetching without Range header...");
  
  try {
    const res = await fetch(tunnelUrl, {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)',
      }
    });
    
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get('content-type'));
    console.log("Content-Length:", res.headers.get('content-length'));
    
    // Read first chunk
    const reader = res.body.getReader();
    const { value, done } = await reader.read();
    console.log("First chunk size:", value ? value.length : 0);
    
    // Check if it's actually video data (MKV starts with 0x1A45DFA3)
    if (value && value.length > 4) {
      const hex = Array.from(value.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log("First 8 bytes (hex):", hex);
      
      if (value[0] === 0x1A && value[1] === 0x45 && value[2] === 0xDF && value[3] === 0xA3) {
        console.log("✅ This is a valid MKV/WebM file!");
      } else {
        console.log("❌ Not a valid MKV/WebM file. Might be HTML error page.");
        const text = new TextDecoder().decode(value.slice(0, 200));
        console.log("Content preview:", text);
      }
    }
    
    reader.cancel();
  } catch(e) {
    console.error("ERROR:", e.message);
  }
}

run();
