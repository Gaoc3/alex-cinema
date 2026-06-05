const fs = require('fs');

async function run() {
  const url = "https://cinemana.shabakaty.com/main.14e3464c8b60094796b2.js";
  console.log("Fetching main bundle...");
  const res = await fetch(url);
  const code = await res.text();
  
  // Search for advanceSearch in bundle
  let idx = 0;
  let cnt = 0;
  while ((idx = code.indexOf('advanceSearch', idx)) !== -1) {
    cnt++;
    const start = Math.max(0, idx - 150);
    const end = Math.min(code.length, idx + 400);
    console.log(`Occurrence #${cnt} at ${idx}:`);
    console.log(code.substring(start, end).replace(/\n/g, ' '));
    console.log('-------------------');
    idx += 'advanceSearch'.length;
  }

  // Also search for AdvancedSearch filter keys (e.g. videoTitle, title, name, year, genre)
  const keywords = ['videoTitle', 'video_title', 'search_title', 'AdvancedSearch'];
  for (const kw of keywords) {
    let index = 0;
    let count = 0;
    while ((index = code.indexOf(kw, index)) !== -1) {
      count++;
      const start = Math.max(0, index - 100);
      const end = Math.min(code.length, index + 300);
      console.log(`Keyword: "${kw}" (#${count})`);
      console.log(`Context: ${code.substring(start, end).replace(/\n/g, ' ')}`);
      console.log('-------------------');
      index += kw.length;
      if (count >= 5) break;
    }
  }
}

run();
