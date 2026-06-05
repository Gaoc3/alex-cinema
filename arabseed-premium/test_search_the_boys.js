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
  const q = 'The Boys';
  const url = `https://cinemana.shabakaty.com/api/android/AdvancedSearch?level=2&videoTitle=${encodeURIComponent(q)}`;
  console.log(`Searching AdvancedSearch with videoTitle for '${q}'...`);
  const data = await fetchRaw(url);
  if (Array.isArray(data)) {
    console.log(`  Results count: ${data.length}`);
    data.forEach((item, index) => {
      console.log(`    ${index + 1}. ID: ${item.nb}, AR: "${item.ar_title}", EN: "${item.en_title}", Year: ${item.year}`);
    });
  } else {
    console.log(`  Response:`, JSON.stringify(data).substring(0, 150));
  }
}

run();
