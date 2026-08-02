import { decryptData } from '@/utils/cryptoHelper';

// Shabakaty internal HTTPS endpoints use custom/unverified leaf SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const CINEMANA_API_BASE = new URL('https://cinemana.shabakaty.com/api/android/');

// Memory cache for Cinemana API requests to provide 0ms latency on repeated calls
const apiMemoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function resolveCinemanaEndpoint(endpoint: string, params: Record<string, string>): URL | null {
  const relativeEndpoint = endpoint.trim();
  if (
    !relativeEndpoint
    || relativeEndpoint.startsWith('/')
    || relativeEndpoint.includes('\\')
    || /^[a-z][a-z\d+.-]*:/i.test(relativeEndpoint)
  ) return null;

  try {
    const target = new URL(relativeEndpoint, CINEMANA_API_BASE);
    if (target.origin !== CINEMANA_API_BASE.origin) return null;
    if (!target.pathname.startsWith(CINEMANA_API_BASE.pathname) || target.pathname === CINEMANA_API_BASE.pathname) return null;
    if (target.hash) return null;

    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }
    return target;
  } catch {
    return null;
  }
}

export async function fetchCinemana(endpoint: string, params: Record<string, string> = {}, revalidate: number = 3600) {
  void revalidate;
  const targetUrl = resolveCinemanaEndpoint(endpoint, params);
  if (!targetUrl) {
    console.error('[Cinemana Fetch Error]: Invalid API endpoint');
    return null;
  }

  const cacheKey = targetUrl.href;
  const cached = apiMemoryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const fullEndpoint = `${targetUrl.pathname.slice(CINEMANA_API_BASE.pathname.length)}${targetUrl.search}`;
  const isServer = typeof window === 'undefined';

  if (isServer) {
    // /etc/hosts routes shabakaty.com → 127.0.0.1:443 (router SSH reverse tunnel)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s fast timeout to prevent NGINX 502 Gateway timeouts

    try {
      const { fetchWithRedirects, readResponseTextWithLimit } = await import('@/utils/proxyHelper');
      const headers = new Headers({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'bypass-tunnel-reminder': 'true',
      });
      const res = await fetchWithRedirects(targetUrl.href, headers, 5, controller.signal);

      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        return null;
      }
      const text = await readResponseTextWithLimit(res, 10 * 1024 * 1024);
      try {
        const raw = JSON.parse(text);
        
        // Sanitize all shabakaty URLs before data reaches client components
        const { sanitizeVideoData } = await import('./serverCrypto');
        const sanitized = sanitizeVideoData(raw);

        if (sanitized) {
          apiMemoryCache.set(cacheKey, { data: sanitized, expiresAt: Date.now() + API_CACHE_TTL });
        }
        return sanitized;
      } catch {
        return null;
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('[Server Fetch Error]:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Client-side fetch via our proxy — NO encryption keys needed
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`/api/proxy?endpoint=${encodeURIComponent(fullEndpoint)}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'bypass-tunnel-reminder': 'true'
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const decrypted = decryptData(data.payload);
    if (decrypted) {
      apiMemoryCache.set(cacheKey, { data: decrypted, expiresAt: Date.now() + API_CACHE_TTL });
    }
    return decrypted;
  } catch (error: unknown) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      console.error('[Client Fetch Error]:', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getHomeVideos() { return fetchCinemana('latestMovies/level/2/itemsPerPage/24/page/1/'); }
export async function getPromoVideos() { return fetchCinemana('banner/level/1'); }
export async function getLatestMovies(page = 1) { return fetchCinemana(`latestMovies/level/2/itemsPerPage/24/page/${page}/`); }
export async function getLatestSeries(page = 1) { return fetchCinemana(`latestSeries/level/2/itemsPerPage/24/page/${page}/`); }
export async function getCategories() { return fetchCinemana('mainCategories', { lang: 'ar' }); }
export async function getMoviesByCategory(categoryId: string, kind = '1', offset = 0) {
  const data = await fetchCinemana('videosByCategory', { categoryID: categoryId, orderby: 'desc', videoKind: kind, offset: offset.toString(), level: '2' });
  return data?.info || [];
}

export async function getVideoDetails(id: string) {
  const [data, streams] = await Promise.all([
    fetchCinemana(`allVideoInfo/id/${id}`),
    fetchCinemana(`transcoddedFiles/id/${id}`).catch(() => []),
  ]);

  if (data) {
    data.streams = Array.isArray(streams) ? streams : [];
    
    if (data.streams.length > 0) {
      data.stream_url = data.streams[0].videoUrl;
      data.direct_stream_url = data.streams[0].directUrl || data.streams[0].videoUrl;

      // SSR Proactive Prefetching: Prefetch MP4 Moov Atom into VPS RAM before client loads page
      if (typeof window === 'undefined') {
        import('../app/api/tunnel-video/route').then(({ triggerTailPrefetch }) => {
          import('./serverCrypto').then(({ decryptPath }) => {
            import('../utils/shabakatyUrl').then(({ resolveShabakatyReference }) => {
              try {
                const ref = new URL(data.stream_url, 'https://cinax.live').searchParams.get('ref');
                if (ref) {
                  const decrypted = decryptPath(ref);
                  if (decrypted) {
                    const approved = resolveShabakatyReference(decrypted);
                    if (approved) {
                      triggerTailPrefetch(approved.href, 200_000_000);
                    }
                  }
                }
              } catch {}
            });
          });
        }).catch(() => undefined);
      }
    } else if (data.fileFile) {
      if (typeof window === 'undefined') {
        const { sanitizeUrl } = await import('./serverCrypto');
        data.stream_url = sanitizeUrl(`https://cndw2.shabakaty.com/m240/${data.fileFile}`);
      } else {
        data.stream_url = `/api/stream?ref=fallback`;
      }
    }
  }
  return data;
}

export async function getSeriesSeasons(seriesId: string) { return fetchCinemana(`videoSeasonNumber/id/${seriesId}`); }
export async function getSeriesEpisodes(seriesId: string) { return fetchCinemana(`videoSeason/id/${seriesId}`); }
export async function searchMovies(query: string, type: 'movies' | 'series' = 'movies') {
  return fetchCinemana('AdvancedSearch', { level: '1', videoTitle: query, staffTitle: query, page: '0', year: '1900,2026', type });
}
