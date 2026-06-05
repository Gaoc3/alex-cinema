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
  const catId = '57'; // Action 
  // Let's test videosByCategory with correct videoKind
  const url1 = `https://cinemana.shabakaty.com/api/android/videosByCategory?categoryID=${catId}&orderby=desc&videoKind=1&offset=0&level=2`;
  console.log("Fetching videosByCategory with videoKind=1...");
  const data1 = await fetchRaw(url1);
  console.log("videosByCategory result count:", Array.isArray(data1) ? data1.length : "failed");
  if (Array.isArray(data1) && data1.length > 0) {
    console.log("First item:", data1[0].ar_title || data1[0].en_title);
  } else {
    console.log("Raw response:", JSON.stringify(data1).substring(0, 300));
  }
}

run();
