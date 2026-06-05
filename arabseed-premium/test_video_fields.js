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
  console.log("Fetching home videos...");
  const videos = await fetchRaw(`https://cinemana.shabakaty.com/api/android/video`);
  if (Array.isArray(videos) && videos.length > 0) {
    console.log("First video fields:", Object.keys(videos[0]));
    console.log("Values for img fields:");
    console.log("img:", videos[0].img);
    console.log("imgThumb:", videos[0].imgThumb);
    console.log("imgMediumThumb:", videos[0].imgMediumThumb);
  } else {
    console.log("Failed to fetch videos array:", videos);
  }
}

run();
