process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const http = require('http');

async function test() {
  const url = 'http://localhost:3000/api/img?type=cover&file=15256CB5-A55C-409E-C47C-711DD708E7A5_cover.jpg';
  console.log('Testing:', url);
  const res = await fetch(url);
  console.log('STATUS:', res.status);
  console.log('HEADERS:', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('BODY_LENGTH:', text.length, 'START:', text.slice(0, 80));
}
test();
