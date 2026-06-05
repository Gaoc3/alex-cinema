const fs = require('fs');

async function run() {
  const url = "https://cinemana.shabakaty.com/main.14e3464c8b60094796b2.js";
  console.log("Fetching main bundle...");
  const res = await fetch(url);
  const code = await res.text();
  
  // Find where the API routes are defined
  // Usually they are in an object like {video:{allVideoInfo:a+"allVideoInfo/id/{videoId}", ...}}
  // Let's find: 'allVideoInfo:a+"allVideoInfo/id/{videoId}"'
  const target = 'allVideoInfo:a+"allVideoInfo/id/{videoId}"';
  const index = code.indexOf(target);
  if (index !== -1) {
    const start = Math.max(0, index - 1000);
    const end = Math.min(code.length, index + 3000);
    console.log("Found API routes definitions block:");
    console.log(code.substring(start, end));
  } else {
    console.log("Could not find the exact route definition string.");
  }
}

run();
