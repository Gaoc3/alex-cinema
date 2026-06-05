// Test direct CDN access (not through tunnel)
async function run() {
  const videoUrl = "https://cndw2.shabakaty.com/m240/6CE1089D-35E9-CEFD-0029-75D8B1D1E91E_video.mkv";
  
  console.log("Test 1: Direct CDN access...");
  try {
    const res = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)',
        'Range': 'bytes=0-1023'
      }
    });
    console.log("Direct Status:", res.status);
    console.log("Direct Content-Type:", res.headers.get('content-type'));
    const reader = res.body.getReader();
    const { value } = await reader.read();
    console.log("Bytes received:", value ? value.length : 0);
    if (value && value.length > 4) {
      const hex = Array.from(value.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log("First 8 bytes:", hex);
      if (value[0] === 0x1A && value[1] === 0x45) {
        console.log("✅ Valid MKV!");
      } else {
        console.log("Content:", new TextDecoder().decode(value.slice(0, 200)));
      }
    }
    reader.cancel();
  } catch(e) {
    console.error("Direct error:", e.message);
  }

  // Test different CDN domains
  const cdns = [
    "https://cndw2.shabakaty.com/m240/",
    "https://cnth2.shabakaty.com/m240/",
    "https://cndw1.shabakaty.com/m240/",
  ];
  const file = "6CE1089D-35E9-CEFD-0029-75D8B1D1E91E_video.mkv";
  
  for (const cdn of cdns) {
    const url = cdn + file;
    console.log(`\nTesting: ${cdn}...`);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)',
          'Range': 'bytes=0-1023'
        }
      });
      console.log(`  Status: ${res.status}`);
      if (res.ok || res.status === 206) {
        const reader = res.body.getReader();
        const { value } = await reader.read();
        console.log(`  Bytes: ${value ? value.length : 0}`);
        reader.cancel();
      }
    } catch(e) {
      console.error(`  Error: ${e.message}`);
    }
  }
}

run();
