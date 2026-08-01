process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const path = require('path');

async function testDirect() {
  const file = '15256CB5-A55C-409E-C47C-711DD708E7A5_cover.jpg';
  const url = `https://cnth2.shabakaty.com/vascin-cover-images/${file}`;
  console.log('Fetching direct upstream:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
        'Referer': 'https://cinemana.shabakaty.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    console.log('UPSTREAM STATUS:', res.status);
    console.log('UPSTREAM HEADERS:', Object.fromEntries(res.headers.entries()));
    const buf = await res.arrayBuffer();
    console.log('UPSTREAM BODY BYTE LENGTH:', buf.byteLength);
    const bytes = new Uint8Array(buf.slice(0, 10));
    console.log('FIRST 10 BYTES:', Array.from(bytes).map(b => '0x' + b.toString(16)).join(' '));
  } catch (err) {
    console.error('UPSTREAM ERR:', err);
  }
}

testDirect();
