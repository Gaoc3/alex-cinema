const SHABAKATY_HOST_PATTERN = /^(?:[a-z0-9-]+\.)+shabakaty\.com$/i;
const SUBDOMAIN_PATTERN = /^[a-z0-9-]{1,63}$/i;

export function parseAllowedShabakatyUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port && parsed.port !== '443') return null;
    if (!SHABAKATY_HOST_PATTERN.test(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requireAllowedShabakatyUrl(value: string): URL {
  const parsed = parseAllowedShabakatyUrl(value);
  if (!parsed) throw new Error('Upstream URL is not allowed');
  return parsed;
}

/** Accepts either a full approved URL or the encrypted `/subdomain/path` payload format. */
export function resolveShabakatyReference(value: string): URL | null {
  const absolute = parseAllowedShabakatyUrl(value);
  if (absolute) {
    if (absolute.hostname.startsWith('vascin') || absolute.hostname.startsWith('cinemana')) {
      absolute.hostname = 'cnth2.shabakaty.com';
    }
    return absolute;
  }

  const parts = value.split('/').filter(Boolean);
  let subdomain = parts.shift();
  if (!subdomain || !SUBDOMAIN_PATTERN.test(subdomain) || parts.length === 0) return null;

  // Direct canonical CDN resolution: vascin24-mp4 / cinemana -> cnth2 (bypasses 302 redirect roundtrip)
  if (subdomain.startsWith('vascin') || subdomain.startsWith('cinemana')) {
    subdomain = 'cnth2';
  }

  const pathAndQuery = value.slice(value.indexOf(subdomain) + subdomain.length);
  return parseAllowedShabakatyUrl(`https://${subdomain}.shabakaty.com${pathAndQuery}`);
}

export function isHlsUrl(value: string) {
  try {
    return new URL(value, 'https://cinax.live').pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return false;
  }
}
