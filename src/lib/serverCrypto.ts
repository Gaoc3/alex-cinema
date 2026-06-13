import 'server-only';
import CryptoJS from 'crypto-js';

// Server-only secret — NEVER exposed to the client bundle
const PROXY_SECRET = process.env.PROXY_SECRET || 'fallback-proxy-secret-change-me';
const PROXY_KEY = CryptoJS.enc.Utf8.parse(PROXY_SECRET.padEnd(32, '0').slice(0, 32));
const PROXY_IV = CryptoJS.enc.Utf8.parse(PROXY_SECRET.slice(0, 16).padEnd(16, '0'));

/**
 * Encrypts a URL path using AES with a server-only key.
 * The key NEVER leaves the server.
 */
export function encryptPath(path: string): string {
  const encrypted = CryptoJS.AES.encrypt(path, PROXY_KEY, { iv: PROXY_IV }).toString();
  // Make URL-safe
  return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decrypts a URL-safe token back to the original path.
 */
export function decryptPath(token: string): string {
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const bytes = CryptoJS.AES.decrypt(base64, PROXY_KEY, { iv: PROXY_IV });
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || '';
  } catch {
    return '';
  }
}

/**
 * Converts a full shabakaty URL to a safe proxy URL.
 * Only the path is encrypted — the domain is NEVER sent to the client.
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('shabakaty.com')) return url;

  try {
    const parsed = new URL(url);
    const pathWithSearch = parsed.pathname + parsed.search;
    const encPath = encryptPath(pathWithSearch);

    if (url.includes('.mp4') || url.includes('video') || url.includes('.m3u8') || url.includes('.ts') || url.includes('.srt') || url.includes('.vtt')) {
      const ext = url.includes('.m3u8') ? '&ext=.m3u8' : url.includes('.mp4') ? '&ext=.mp4' : '';
      return `/api/stream?ref=${encPath}${ext}`;
    }
    return `/tunnel${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

// Fields that may contain shabakaty URLs
const URL_FIELDS = [
  'imgObjUrl', 'imgMediumThumb', 'imgThumb', 'imgBig',
  'stream_url', 'arTranslationFilePath', 'enTranslationFilePath',
  'videoUrl' // ADDED THIS!
];

/**
 * Recursively sanitizes all shabakaty URLs in video data.
 * Called after server-side fetch, BEFORE data reaches client components.
 * The `img` field is left untouched if it's just a filename (no domain).
 */
export function sanitizeVideoData<T>(data: T): T {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(item => sanitizeVideoData(item)) as T;
  if (typeof data !== 'object') return data;

  const result = { ...(data as Record<string, unknown>) };

  // Sanitize known URL fields (only if they contain shabakaty URLs)
  for (const field of URL_FIELDS) {
    const val = result[field];
    if (val && typeof val === 'string' && val.includes('shabakaty.com')) {
      result[field] = sanitizeUrl(val);
    }
  }

  // Special handling for `img`: only sanitize if it's a full shabakaty URL
  // If it's just a filename like "12345.jpg", leave it for the client to use with /api/img?type=poster&file=
  if (result.img && typeof result.img === 'string' && result.img.includes('shabakaty.com')) {
    result.img = sanitizeUrl(result.img as string);
  }

  // Sanitize streams array
  if (Array.isArray(result.streams)) {
    result.streams = (result.streams as Record<string, unknown>[]).map((stream) => ({
      ...stream,
      videoUrl: stream.videoUrl && typeof stream.videoUrl === 'string'
        ? sanitizeUrl(stream.videoUrl)
        : stream.videoUrl,
    }));
  }

  // Sanitize translations array
  if (Array.isArray(result.translations)) {
    result.translations = (result.translations as Record<string, unknown>[]).map((t) => ({
      ...t,
      file: t.file && typeof t.file === 'string'
        ? sanitizeUrl(t.file)
        : t.file,
    }));
  }

  return result as T;
}
