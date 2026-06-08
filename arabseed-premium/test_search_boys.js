const TUNNEL_BASE = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=";

async function fetchRaw(url) {
  const tunnelUrl = `${TUNNEL_BASE}${encodeURIComponent(url)}`;
  const res = await fetch(tunnelUrl, {
    headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)' }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return text; }
}

async function run() {
  const keywords = ['boys', 'Boys', 'The Boys', 'ذا بويز', 'بويز'];
  for (const keyword of keywords) {
    const url = `https://cinemana.shabakaty.com/api/android/video/V/2/itemsPerPage/20/video_title_search/${encodeURIComponent(keyword)}/itemsPerPage/12/pageNumber/0/level/2`;
    console.log(`Searching for '${keyword}'...`);
    const data = await fetchRaw(url);
    if (Array.isArray(data)) {
      console.log(`Results for '${keyword}': ${data.length}`);
      if (data.length > 0) {
        console.log(`  First result: AR: "${data[0].ar_title}", EN: "${data[0].en_title}", ID: "${data[0].nb}"`);
      }
    } else {
      console.log(`Raw response:`, JSON.stringify(data).substring(0, 200));
    }
  }
}

run();
