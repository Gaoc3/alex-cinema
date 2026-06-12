const fs = require('fs');
const CryptoJS = require('crypto-js');

// Mock serverCrypto
const PROXY_SECRET = 'fallback-proxy-secret-change-me';
const PROXY_KEY = CryptoJS.enc.Utf8.parse(PROXY_SECRET.padEnd(32, '0').slice(0, 32));
const PROXY_IV = CryptoJS.enc.Utf8.parse(PROXY_SECRET.slice(0, 16).padEnd(16, '0'));

function encryptPath(path) {
  const encrypted = CryptoJS.AES.encrypt(path, PROXY_KEY, { iv: PROXY_IV }).toString();
  return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('shabakaty.com')) return url;
  try {
    const encPath = encryptPath(url);
    if (url.includes('.mp4') || url.includes('video') || url.includes('.m3u8') || url.includes('.ts')) {
      return `/api/stream?ref=${encPath}`;
    }
    return `/api/img?ref=${encPath}`;
  } catch {
    return url;
  }
}

const URL_FIELDS = [
  'imgObjUrl', 'imgMediumThumb', 'imgThumb', 'imgBig',
  'stream_url', 'arTranslationFilePath', 'enTranslationFilePath',
];

function sanitizeVideoData(data) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(item => sanitizeVideoData(item));
  if (typeof data !== 'object') return data;

  const result = { ...data };

  for (const field of URL_FIELDS) {
    const val = result[field];
    if (val && typeof val === 'string' && val.includes('shabakaty.com')) {
      result[field] = sanitizeUrl(val);
    }
  }

  if (result.img && typeof result.img === 'string' && result.img.includes('shabakaty.com')) {
    result.img = sanitizeUrl(result.img);
  }

  if (Array.isArray(result.streams)) {
    result.streams = result.streams.map((stream) => ({
      ...stream,
      videoUrl: stream.videoUrl && typeof stream.videoUrl === 'string'
        ? sanitizeUrl(stream.videoUrl)
        : stream.videoUrl,
    }));
  }

  return result;
}

async function test() {
  const fullEndpoint = 'transcoddedFiles/id/3087929';
  const res = await fetch(`https://cinemana.shabakaty.com/api/android/${fullEndpoint}`);
  const data = await res.json();
  const sanitized = sanitizeVideoData(data);
  console.log(JSON.stringify(sanitized, null, 2));
}

test();
