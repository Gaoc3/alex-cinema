const TUNNEL_BASE = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=";

async function fetchCinemana(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
  const targetUrl = `https://cinemana.shabakaty.com/api/android/${fullEndpoint}`;
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(targetUrl)}`;
  const res = await fetch(tunnelUrl, {
    headers: {
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)'
    }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  const search = await fetchCinemana('advancedSearch', { title: 'Inception' });
  if(search && search.length > 0) {
    const id = search[0].nb;
    console.log("Inception ID:", id);
    const info = await fetchCinemana('videoInfo', { id });
    console.log("File:", info.fileFile);
    if(info.videoFiles) console.log("videoFiles:", info.videoFiles);
  }
}

run();
