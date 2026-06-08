const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

async function fetchCinemana(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
  const targetUrl = `https://cinemana.shabakaty.com/api/android/${fullEndpoint}`;
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(targetUrl)}`;
  const res = await fetch(tunnelUrl, {
    headers: {
      'User-Agent': 'Cinemana/3.1.2 (iPhone; iOS 15.0; Scale/3.00)'
    }
  });
  return res.json();
}

async function run() {
  const data = await fetchCinemana('videoInfo', { id: '3101066' });
  const fs = require('fs');
  fs.writeFileSync('test_ios.json', JSON.stringify(data, null, 2));
  console.log('Saved to test_ios.json');
}

run();
