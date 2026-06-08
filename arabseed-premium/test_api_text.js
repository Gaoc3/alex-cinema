const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

async function fetchCinemana(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
  const targetUrl = `https://cinemana.shabakaty.com/api/android/${fullEndpoint}`;
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(targetUrl)}`;
  console.log("Fetching:", tunnelUrl);

  const res = await fetch(tunnelUrl, {
    headers: {
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)'
    }
  });
  const text = await res.text();
  console.log("Raw response:", text.substring(0, 500));
  return JSON.parse(text);
}

async function run() {
  try {
    const data = await fetchCinemana('videoInfo', { id: '3101066' });
    console.log('Success!', data.nb);
  } catch(e) {
    console.error("Error parsing:", e);
  }
}

run();
