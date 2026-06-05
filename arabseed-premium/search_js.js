const fs = require('fs');

async function run() {
  const url = "https://cinemana.shabakaty.com/main.14e3464c8b60094796b2.js";
  console.log("Fetching main bundle...");
  const res = await fetch(url);
  const code = await res.text();
  console.log("Code length:", code.length);
  
  // Search for keywords
  const keywords = [
    'transcodings',
    'allVideoInfo',
    'videoInfo',
    'videoFiles',
    'videoUrl',
    'fileFile',
    'vascin-video-files',
    'shabakaty.com/api',
    'video/play',
    'getStream',
    'videoStream',
    'playVideo',
    'Signature',
    'AWSAccessKeyId'
  ];
  
  for (const kw of keywords) {
    let index = 0;
    let count = 0;
    while ((index = code.indexOf(kw, index)) !== -1) {
      count++;
      // Print context (50 chars before and after)
      const start = Math.max(0, index - 80);
      const end = Math.min(code.length, index + kw.length + 80);
      console.log(`Keyword: "${kw}" (#${count})`);
      console.log(`Context: ... ${code.substring(start, end).replace(/\n/g, ' ')} ...`);
      console.log('-------------------');
      index += kw.length;
      if (count >= 10) {
        console.log(`Truncated further matches for "${kw}"`);
        break;
      }
    }
  }
}

run();
