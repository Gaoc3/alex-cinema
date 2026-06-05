const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";
const fs = require('fs');

async function fetchRaw(url) {
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(url)}`;
  const res = await fetch(tunnelUrl, {
    headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  const videoId = '3101066';
  
  console.log("Fetching allVideoInfo...");
  const allVideoInfo = await fetchRaw(`https://cinemana.shabakaty.com/api/android/allVideoInfo?id=${videoId}`);
  fs.writeFileSync('allVideoInfo.json', JSON.stringify(allVideoInfo, null, 2));
  
  console.log("Fetching videoInfo...");
  const videoInfo = await fetchRaw(`https://cinemana.shabakaty.com/api/android/videoInfo?id=${videoId}`);
  fs.writeFileSync('videoInfo.json', JSON.stringify(videoInfo, null, 2));
  
  console.log("Done. Keys in allVideoInfo:", Object.keys(allVideoInfo));
  console.log("Keys in videoInfo:", Object.keys(videoInfo));
}

run();
