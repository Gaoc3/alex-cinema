const fs = require('fs');

async function run() {
  const url = "https://cinemana.shabakaty.com/main.14e3464c8b60094796b2.js";
  console.log("Fetching main bundle...");
  const res = await fetch(url);
  const code = await res.text();
  
  // Look for occurrences of videosByCategory in method calls
  let idx = 0;
  let cnt = 0;
  while ((idx = code.indexOf('videosByCategory', idx)) !== -1) {
    cnt++;
    // If it's part of a method or call
    const start = Math.max(0, idx - 150);
    const end = Math.min(code.length, idx + 300);
    console.log(`Occurrence #${cnt} at ${idx}:`);
    console.log(code.substring(start, end).replace(/\n/g, ' '));
    console.log('-------------------');
    idx += 'videosByCategory'.length;
  }
}

run();
