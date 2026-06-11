import { encodeProxyUrl } from '@/utils/proxyHelper';
import { decryptData } from '@/utils/cryptoHelper';
export async function fetchCinemana(endpoint: string, params: Record<string, string> = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
  
  const isServer = typeof window === 'undefined';

  if (isServer) {
    let targetUrl = `https://cinemana.shabakaty.com/api/android/${fullEndpoint}`;
    const tunnelBase = (process.env.TUNNEL_BASE_URL || '').replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    if (tunnelBase) {
      targetUrl = `${tunnelBase}/api/android/${fullEndpoint}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(targetUrl, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'bypass-tunnel-reminder': 'true'
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const text = await res.text();
      try {
        return JSON.parse(text); // Shabakaty returns raw JSON, no decryption needed on server directly
      } catch {
        return null;
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name !== 'AbortError') console.error('[Server Fetch Error]:', e.message);
      return null;
    }
  }

  // Client-side fetch via our proxy
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`/api/proxy?endpoint=${encodeProxyUrl(fullEndpoint)}`, {
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
    return decryptData(data.payload);
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name !== 'AbortError') console.error('[Client Fetch Error]:', e.message);
    return null;
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
  const data = await fetchCinemana(`allVideoInfo/id/${id}`);
  if (data) {
    try {
      const streams = await fetchCinemana(`transcoddedFiles/id/${id}`);
      console.log(`[DEBUG] transcoddedFiles returned for ${id}:`, streams);
      data.streams = Array.isArray(streams) ? streams : [];
    } catch (e) {
      console.error('Error fetching streams:', e);
      data.streams = [];
    }
    
    if (data.streams.length > 0) {
      data.stream_url = data.streams[0].videoUrl;
    } else if (data.fileFile) {
      data.stream_url = `https://cndw2.shabakaty.com/m240/${data.fileFile}`;
    }
  }
  return data;
}
export async function getSeriesSeasons(seriesId: string) { return fetchCinemana(`videoSeasonNumber/id/${seriesId}`); }
export async function getSeriesEpisodes(seriesId: string) { return fetchCinemana(`videoSeason/id/${seriesId}`); }
export async function searchMovies(query: string, type: 'movies' | 'series' = 'movies') {
  return fetchCinemana('AdvancedSearch', { level: '1', videoTitle: query, staffTitle: query, page: '0', year: '1900,2026', type });
}