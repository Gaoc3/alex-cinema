const crypto = require('crypto');

async function test() {
    const res = await fetch('https://alex-cinema.vercel.app/api/proxy?endpoint=videoInfo/id/3084827');
    const data = await res.json();
    const payload = data.payload;

    const ENCRYPTION_KEY = Buffer.from('4a9f3e8b2c1d7a6f5e4d3c2b1a09876543210fedcba9876543210fedcba98765', 'hex');
    const parts = payload.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const json = JSON.parse(decrypted.toString());
    
    // print some video urls
    if (json.translations) {
        console.log("Translations (video urls):");
        json.translations.forEach(t => {
            console.log(t.name, t.url);
        });
    }
}

test().catch(console.error);
