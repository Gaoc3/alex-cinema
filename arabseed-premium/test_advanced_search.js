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
  const tests = [
    'AdvancedSearch?level=2&title=Boys',
    'AdvancedSearch?level=2&video_title=Boys',
    'AdvancedSearch?level=2&keyword=Boys',
    'AdvancedSearch?level=2&video_title_search=Boys',
    'AdvancedSearch?level=2&q=Boys',
    'AdvancedSearch?level=2&search=Boys',
  ];

  for (const t of tests) {
    const url = `https://cinemana.shabakaty.com/api/android/${t}`;
    console.log(`Testing ${t}...`);
    const data = await fetchRaw(url);
    if (data && typeof data === 'object') {
      const isArr = Array.isArray(data);
      const len = isArr ? data.length : (data.info ? data.info.length : 0);
      console.log(`  Result type: ${typeof data}, isArray: ${isArr}, count: ${len}`);
      if (len > 0) {
        const item = isArr ? data[0] : data.info[0];
        console.log(`  First result title: AR: "${item.ar_title}", EN: "${item.en_title}"`);
        break; // found!
      }
    } else {
      console.log(`  Empty or error: ${JSON.stringify(data).substring(0, 100)}`);
    }
  }
}

run();
