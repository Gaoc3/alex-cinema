import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import CryptoJS from 'crypto-js';
import { isHlsUrl, parseAllowedShabakatyUrl } from '@/utils/shabakatyUrl';

const TOKEN_VERSION = 1;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const MAX_TOKEN_LENGTH = 8_192;

function getProxyKey() {
  const secret = process.env.PROXY_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('PROXY_SECRET must contain at least 32 characters');
  }
  return createHash('sha256').update(secret).digest();
}

function decryptLegacyPath(token: string): string {
  try {
    const secret = process.env.PROXY_SECRET_LEGACY || process.env.PROXY_SECRET;
    if (!secret) return '';
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const key = CryptoJS.enc.Utf8.parse(secret.padEnd(32, '0').slice(0, 32));
    const iv = CryptoJS.enc.Utf8.parse(secret.slice(0, 16).padEnd(16, '0'));
    return CryptoJS.AES.decrypt(base64, key, { iv }).toString(CryptoJS.enc.Utf8) || '';
  } catch {
    return '';
  }
}

/** Creates a randomized, authenticated, URL-safe server-only reference. */
export function encryptPath(path: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getProxyKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(path, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([TOKEN_VERSION]), iv, authTag, ciphertext]).toString('base64url');
}

export function decryptPath(token: string): string {
  try {
    if (!token || token.length > MAX_TOKEN_LENGTH) return '';
    const payload = Buffer.from(token, 'base64url');
    if (payload.length <= 1 + IV_LENGTH + AUTH_TAG_LENGTH || payload[0] !== TOKEN_VERSION) {
      return decryptLegacyPath(token);
    }

    const ivStart = 1;
    const tagStart = ivStart + IV_LENGTH;
    const ciphertextStart = tagStart + AUTH_TAG_LENGTH;
    const decipher = createDecipheriv('aes-256-gcm', getProxyKey(), payload.subarray(ivStart, tagStart));
    decipher.setAuthTag(payload.subarray(tagStart, ciphertextStart));
    return Buffer.concat([
      decipher.update(payload.subarray(ciphertextStart)),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return decryptLegacyPath(token);
  }
}

export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  try {
    const parsed = parseAllowedShabakatyUrl(url);
    if (!parsed) return url;
    const subdomain = parsed.hostname.split('.')[0];
    const pathWithSearch = `/${subdomain}${parsed.pathname}${parsed.search}`;
    const encPath = encryptPath(isHlsUrl(parsed.href) ? parsed.href : pathWithSearch);

    if (isHlsUrl(parsed.href)) return `/api/hls?ref=${encPath}`;
    if (parsed.pathname.endsWith('.mp4') || parsed.pathname.endsWith('.ts')) {
      return `/api/tunnel-video?ref=${encPath}`;
    }
    if (parsed.pathname.endsWith('.srt') || parsed.pathname.endsWith('.vtt')) {
      return `/api/stream?ref=${encPath}`;
    }
    return `/api/img?ref=${encPath}`;
  } catch {
    return url;
  }
}

const URL_FIELDS = [
  'imgObjUrl', 'imgMediumThumb', 'imgThumb', 'imgBig',
  'stream_url', 'videoUrl', 'arTranslationFilePath', 'enTranslationFilePath',
];

export function sanitizeVideoData<T>(data: T): T {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((item) => sanitizeVideoData(item)) as T;
  if (typeof data !== 'object') return data;

  const result = { ...(data as Record<string, unknown>) };
  for (const field of URL_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && parseAllowedShabakatyUrl(value)) {
      result[field] = sanitizeUrl(value);
    }
  }

  if (typeof result.img === 'string' && parseAllowedShabakatyUrl(result.img)) {
    result.img = sanitizeUrl(result.img);
  }

  if (Array.isArray(result.streams)) {
    result.streams = (result.streams as Record<string, unknown>[]).map((stream) => ({
      ...stream,
      videoUrl: typeof stream.videoUrl === 'string' ? sanitizeUrl(stream.videoUrl) : stream.videoUrl,
    }));
  }

  if (Array.isArray(result.translations)) {
    result.translations = (result.translations as Record<string, unknown>[]).map((translation) => ({
      ...translation,
      file: typeof translation.file === 'string' ? sanitizeUrl(translation.file) : translation.file,
    }));
  }

  return result as T;
}
