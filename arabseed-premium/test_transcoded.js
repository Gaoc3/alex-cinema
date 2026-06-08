const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

async function fetchRaw(url) {
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(url)}`;
  console.log("Fetching url via tunnel:", url);
  const res = await fetch(tunnelUrl, {
    headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  const videoId = '3101066';
  const data = await fetchRaw(`https://cinemana.shabakaty.com/api/android/transcodgedFiles/id/${videoId}`);
  console.log("transcodgedFiles data:", JSON.stringify(data, null, 2));

  const data2 = await fetchRaw(`https://cinemana.shabakaty.com/api/android/transcoddedFiles/id/${videoId}`);
  console.log("transcoddedFiles data:", JSON.stringify(data2, null, 2));
}

run();
