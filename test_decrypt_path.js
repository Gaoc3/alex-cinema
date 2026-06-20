// Let's just implement the decrypt in js here
const CryptoJS = require('crypto-js');
const PROXY_SECRET = process.env.PROXY_SECRET || 'fallback-proxy-secret-change-me';
const PROXY_KEY = CryptoJS.enc.Utf8.parse(PROXY_SECRET.padEnd(32, '0').slice(0, 32));
const PROXY_IV = CryptoJS.enc.Utf8.parse(PROXY_SECRET.slice(0, 16).padEnd(16, '0'));

function decryptPathTest(encryptedPath) {
  try {
    let base64 = encryptedPath.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const bytes = CryptoJS.AES.decrypt(base64, PROXY_KEY, {
      iv: PROXY_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return null;
  }
}

const ref = 'ZSzijG1kdahu20yQEwAH5kaY7IZxXLy-3UrQY0IEFrH-_6Se-EYn5wLG7l4WbsMYfnW04pTn0C5Vq40zYsUWgAzcICnkUyhqOpWaso5E5tbPW0yqNUfPDgAuszWKTWBaOszjafKsTZzEnO6L8aNy4am68GEqIZLL1KNNDTjoHkkLyTCsJ3AW4ryodtNqKZKomjLpBq0jTEpAF7jIeFTaGIb5rf7gE8UfuHWuCDk3wGA_Pg2M6FwvRKiqjAIAhnUS8M8rFVw9wOHcPAFgX9fgrSdV5mTfja5OqWfjVmibHoUONhQg6rjZ2S7bGIemRwJ2r9SDhmL0i_Dgs1vUEWGXAQ';
console.log(decryptPathTest(ref));
