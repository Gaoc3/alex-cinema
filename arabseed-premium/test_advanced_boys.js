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
  const queries = ['the boys', 'Boys', 'The Boys'];
  for (const q of queries) {
    const url = `https://cinemana.shabakaty.com/api/android/AdvancedSearch?level=2&title=${encodeURIComponent(q)}`;
    console.log(`Searching AdvancedSearch for '${q}'...`);
    const data = await fetchRaw(url);
    if (Array.isArray(data)) {
      console.log(`  Results count: ${data.length}`);
      if (data.length > 0) {
        console.log(`  First: AR: "${data[0].ar_title}", EN: "${data[0].en_title}", ID: "${data[0].nb}"`);
      }
    } else {
      console.log(`  Response:`, JSON.stringify(data).substring(0, 150));
    }
  }
}

run();
