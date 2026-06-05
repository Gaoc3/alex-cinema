const fs = require('fs');

async function run() {
  console.log("Fetching home page HTML...");
  const res = await fetch("https://cinemana.shabakaty.com/home", {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  fs.writeFileSync('cinemana_home.html', html);
  
  // Find all script tags
  const scriptSrcs = [];
  const scriptRegex = /<script[^>]*src=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scriptSrcs.push(match[1]);
  }
  console.log("Found scripts:", scriptSrcs);
}

run();
