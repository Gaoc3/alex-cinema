async function run() {
  // Let's use the 240p signed URL from the previous output
  const signedUrl = "https://cdn.shabakaty.com/vascin24-mp4/838A1187-2946-C706-14D5-3152F5D0DF23_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1781121416&Signature=0SLcXrDbdZmhve38fN%2FS7aGGc9w%3D";
  
  console.log("Testing direct access to signed CDN URL...");
  try {
    const res = await fetch(signedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': 'bytes=0-100' // Request first 100 bytes
      }
    });
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    if (res.ok || res.status === 206) {
      const buffer = await res.arrayBuffer();
      console.log("Successfully downloaded", buffer.byteLength, "bytes directly!");
    } else {
      console.log("Failed with status", res.status);
      const text = await res.text();
      console.log("Error body:", text.substring(0, 300));
    }
  } catch(e) {
    console.error("Direct access error:", e.message);
  }
}

run();
