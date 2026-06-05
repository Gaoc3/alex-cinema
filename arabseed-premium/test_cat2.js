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
  const t1 = await fetchCinemana('advancedSearch', { section: '84' });
  console.log("advancedSearch section 84:", Array.isArray(t1) ? t1.length : (t1 && t1.data ? t1.data.length : 'none'));

  const t2 = await fetchCinemana('video', { categoryId: '84' });
  console.log("video categoryId 84:", Array.isArray(t2) ? t2.length : (t2 && t2.data ? t2.data.length : 'none'));

  const t3 = await fetchCinemana('advancedSearch', { category: '84' });
  console.log("advancedSearch category 84:", Array.isArray(t3) ? t3.length : (t3 && t3.data ? t3.data.length : 'none'));
}

run();
