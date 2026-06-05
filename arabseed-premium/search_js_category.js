const fs = require('fs');

async function run() {
  const url = "https://cinemana.shabakaty.com/main.14e3464c8b60094796b2.js";
  console.log("Fetching main bundle...");
  const res = await fetch(url);
  const code = await res.text();
  
  const keywords = ["videosByCategory", "categoryID", "mainCategories"];
  for (const kw of keywords) {
    let index = 0;
    let count = 0;
    while ((index = code.indexOf(kw, index)) !== -1) {
      count++;
      const start = Math.max(0, index - 100);
      const end = Math.min(code.length, index + kw.length + 200);
      console.log(`Keyword: "${kw}" (#${count})`);
      console.log(`Context: ... ${code.substring(start, end).replace(/\n/g, ' ')} ...`);
      console.log('-------------------');
      index += kw.length;
      if (count >= 5) break;
    }
  }
}

run();
