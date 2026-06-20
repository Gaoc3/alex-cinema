const CryptoJS = require('crypto-js');

async function test() {
    try {
        const res = await fetch('https://alex-cinema.vercel.app/api/proxy?endpoint=videoInfo/id/3084827');
        const data = await res.json();
        const payload = data.payload;

        const PROXY_SECRET = 'fallback-proxy-secret-change-me'; // try fallback
        const PROXY_KEY = CryptoJS.enc.Utf8.parse(PROXY_SECRET.padEnd(32, '0').slice(0, 32));
        const PROXY_IV = CryptoJS.enc.Utf8.parse(PROXY_SECRET.slice(0, 16).padEnd(16, '0'));

        let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        
        // Wait, the NextJS backend ENCRYPTS the URL path (like /video/...), it doesn't encrypt the JSON payload that comes from cinemana API!
        // Wait... DOES it encrypt the whole JSON payload?
        // Let's look at src/app/api/proxy/route.ts!
    } catch(e) {
        console.error(e);
    }
}
test();
