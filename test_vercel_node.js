const CryptoJS = require('crypto-js');

async function test() {
  const PROXY_SECRET = 'fallback-proxy-secret-change-me'; // Or whatever is in Vercel's env? Wait!
  const res = await fetch('https://alex-cinema.vercel.app/api/proxy?endpoint=transcoddedFiles/id/1336019');
  const data = await res.json();
  
  // Wait, if Vercel has a custom PROXY_SECRET in environment variables, I can't decrypt it locally without knowing it!
  // BUT I can just fetch it locally on my machine using Next.js!
}

test().catch(console.error);
