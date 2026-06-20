const CryptoJS = require('crypto-js');

async function test() {
    const res = await fetch('https://alex-cinema.vercel.app/api/proxy?endpoint=videoInfo/id/3084827');
    const data = await res.json();
    const payload = data.payload;

    const SECRET_KEY = 'YOUR_SECRET_KEY'; // Let's try without it first, wait we need the .env
}
test();
