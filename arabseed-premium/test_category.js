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
  const catId = '57'; // Action or Animation? 
  // Let's test videosByCategory
  const url1 = `https://cinemana.shabakaty.com/api/android/videosByCategory?categoryID=${catId}&orderby=desc&videoKind=0&offset=0&level=2`;
  console.log("Fetching videosByCategory...");
  const data1 = await fetchRaw(url1);
  console.log("videosByCategory result count:", Array.isArray(data1) ? data1.length : "failed");

  // Let's test video with categoryId query param
  const url2 = `https://cinemana.shabakaty.com/api/android/video?categoryId=${catId}`;
  console.log("Fetching video?categoryId...");
  const data2 = await fetchRaw(url2);
  console.log("video?categoryId result count:", Array.isArray(data2) ? data2.length : "failed");
}

run();
