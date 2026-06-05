const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";

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
  
  console.log("Fetching allVideoInfo/id/3101066...");
  const detail = await fetchRaw(`https://cinemana.shabakaty.com/api/android/allVideoInfo/id/${videoId}`);
  console.log("Detail title:", detail ? (detail.ar_title || detail.en_title) : "failed");
  
  console.log("Fetching transcoddedFiles/id/3101066...");
  const streams = await fetchRaw(`https://cinemana.shabakaty.com/api/android/transcoddedFiles/id/${videoId}`);
  console.log("Streams count:", Array.isArray(streams) ? streams.length : "failed");
}

run();
