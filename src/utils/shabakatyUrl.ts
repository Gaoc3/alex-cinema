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
  if (!value || typeof value !== 'string') return null;

  const absolute = parseAllowedShabakatyUrl(value);
  if (absolute) {
    if (absolute.hostname.startsWith('vascin') || absolute.hostname.startsWith('cinemana')) {
      absolute.hostname = 'cnth2.shabakaty.com';
    }
    return absolute;
  }

  const parts = value.split('/').filter(Boolean);
  const originalSubdomain = parts.shift();
  if (!originalSubdomain || !SUBDOMAIN_PATTERN.test(originalSubdomain) || parts.length === 0) return null;

  let targetSubdomain = originalSubdomain;
  if (targetSubdomain.startsWith('vascin') || targetSubdomain.startsWith('cinemana')) {
    targetSubdomain = 'cnth2';
  }

  const pathAndQuery = '/' + parts.join('/');
  return parseAllowedShabakatyUrl(`https://${targetSubdomain}.shabakaty.com${pathAndQuery}`);
}

export function isHlsUrl(value: string) {
  try {
    return new URL(value, 'https://cinax.live').pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return false;
  }
}
