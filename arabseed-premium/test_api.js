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
  return res.json();
}

async function run() {
  const data = await fetchCinemana('videoInfo', { nb: '3101066' });
  const fs = require('fs');
  fs.writeFileSync('test_data.json', JSON.stringify(data, null, 2));
  console.log('Saved to test_data.json');
}

run();
