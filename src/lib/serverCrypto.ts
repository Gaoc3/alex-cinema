import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { parseAllowedShabakatyUrl, isHlsUrl } from '@/utils/shabakatyUrl';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PROXY_KEY_SALT = 'alex-cinema-proxy-key-v1';

function getProxyKey(): Buffer {
  const secret = process.env.PROXY_SECRET || 'default_secret_key_32_bytes_len!';
  return createHash('sha256').update(`${secret}:${PROXY_KEY_SALT}`).digest();
}

function getLegacyProxyKey(): Buffer {
  const secret = process.env.PROXY_SECRET || 'default_secret_key_32_bytes_len!';
  return createHash('sha256').update(secret).digest();
}

export function encryptPath(path: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getProxyKey(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(path, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([Buffer.from([0x01]), iv, tag, ciphertext]);
  return payload.toString('base64url');
}

function decryptLegacyPath(token: string): string | null {
  try {
    const payload = Buffer.from(token, 'base64url');
    if (payload.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH) return null;

    const iv = payload.subarray(0, IV_LENGTH);
    const tag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv('aes-256-gcm', getLegacyProxyKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export function decryptPath(token: string): string | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const payload = Buffer.from(token, 'base64url');
    if (payload.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH || payload[0] !== 0x01) {
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

export function getDirectShabakatyUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = parseAllowedShabakatyUrl(url);
    if (!parsed) return url;
    return `https://cnth2.shabakaty.com${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
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
  'arTranslationFilePath', 'enTranslationFilePath',
];

export function sanitizeVideoData<T>(data: T): T {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((item) => sanitizeVideoData(item)) as T;
  if (typeof data !== 'object') return data;

  const result = { ...(data as Record<string, unknown>) };

  if (typeof result.stream_url === 'string' && parseAllowedShabakatyUrl(result.stream_url)) {
    result.direct_stream_url = getDirectShabakatyUrl(result.stream_url);
    result.stream_url = sanitizeUrl(result.stream_url);
  }

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
    result.streams = (result.streams as Record<string, unknown>[]).map((stream) => {
      const rawUrl = typeof stream.videoUrl === 'string' ? stream.videoUrl : '';
      return {
        ...stream,
        directUrl: rawUrl && parseAllowedShabakatyUrl(rawUrl) ? getDirectShabakatyUrl(rawUrl) : undefined,
        videoUrl: rawUrl ? sanitizeUrl(rawUrl) : stream.videoUrl,
      };
    });
  }

  if (Array.isArray(result.translations)) {
    result.translations = (result.translations as Record<string, unknown>[]).map((translation) => ({
      ...translation,
      file: typeof translation.file === 'string' ? sanitizeUrl(translation.file) : translation.file,
    }));
  }

  return result as T;
}
