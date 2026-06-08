const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

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
  return res.json();
}

async function run() {
  const data = await fetchCinemana('videoList', { category: '84', level: '0' });
  console.log(data ? Object.keys(data) : 'null');
  if(data && data.data) {
    console.log("length:", data.data.length);
  } else if (Array.isArray(data)) {
    console.log("is array length:", data.length);
  }
}

run();
