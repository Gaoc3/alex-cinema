const fs = require('fs');

async function run() {
  const url = "https://cinemana.shabakaty.com/main.14e3464c8b60094796b2.js";
  console.log("Fetching main bundle...");
  const res = await fetch(url);
  const code = await res.text();
  console.log("Code length:", code.length);
  
  // Search for getVideo in definition
  const target = "getVideo:";
  let index = 0;
  let count = 0;
  while ((index = code.indexOf(target, index)) !== -1) {
    count++;
    const start = Math.max(0, index - 150);
    const end = Math.min(code.length, index + target.length + 300);
    console.log(`Match #${count}:`);
    console.log(code.substring(start, end).replace(/\n/g, ' '));
    console.log('-------------------');
    index += target.length;
  }

  // Also search for getVideo( or other variations
  const targets = ["getVideo", "getVideoInfo", "transcodings", "videoFiles"];
  for (const t of targets) {
    let idx = 0;
    let cnt = 0;
    while ((idx = code.indexOf(t, idx)) !== -1) {
      cnt++;
      if (code.substring(idx - 10, idx + t.length + 10).includes(':')) {
        const start = Math.max(0, idx - 100);
        const end = Math.min(code.length, idx + t.length + 200);
        console.log(`Key matching "${t}" (#${cnt}):`);
        console.log(code.substring(start, end).replace(/\n/g, ' '));
        console.log('-------------------');
      }
      idx += t.length;
      if (cnt > 5) break;
    }
  }
}

run();
