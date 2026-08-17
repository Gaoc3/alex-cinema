import { NextRequest, NextResponse } from 'next/server';
import {
  getCategories,
  getLatestMovies,
  getLatestSeries,
  getMoviesByCategory,
  getPromoVideos,
  getSeriesEpisodes,
  getSeriesSeasons,
  getVideoDetails,
  searchMovies,
} from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function formatImageUrl(imgFilename?: string | null): string {

  if (!imgFilename) return '/icon.svg';
  if (imgFilename.startsWith('/api/') || imgFilename.startsWith('/tunnel/')) return imgFilename;
  const clean = imgFilename.split('/').pop() || imgFilename;
  return `/api/img?type=poster&file=${encodeURIComponent(clean)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action') || 'popular';

  try {
    if (action === 'search') {
      const q = (searchParams.get('q') || '').trim();
      if (!q) {
        return NextResponse.json({ success: true, results: [] });
      }

      const [moviesRes, seriesRes] = await Promise.allSettled([
        searchMovies(q, 'movies'),
        searchMovies(q, 'series'),
      ]);

      const movies = moviesRes.status === 'fulfilled' && Array.isArray(moviesRes.value) ? moviesRes.value : [];
      const series = seriesRes.status === 'fulfilled' && Array.isArray(seriesRes.value) ? seriesRes.value : [];

      const seenIds = new Set<string>();
      const combined: any[] = [];

      // Extract significant search tokens (excluding common filler words like 'the', 'ذا', 'a')
      const tokens = q.toLowerCase().split(/\s+/).filter(t => t && t !== 'the' && t !== 'a' && t !== 'an' && t !== 'ذا' && t !== 'في' && t !== 'من');

      const matchesQuery = (item: any) => {
        if (tokens.length === 0) return true;
        const text = `${item.ar_title || ''} ${item.en_title || ''}`.toLowerCase();
        return tokens.some(t => text.includes(t));
      };

      for (const m of movies) {
        const id = String(m.nb || m.id);
        if (!seenIds.has(id) && matchesQuery(m)) {
          seenIds.add(id);
          combined.push({ ...m, kind: '1' });
        }
      }

      for (const s of series) {
        const id = String(s.nb || s.id);
        if (!seenIds.has(id) && matchesQuery(s)) {
          seenIds.add(id);
          combined.push({ ...s, kind: '2' });
        }
      }

      // Sort: Exact phrase match first, then by rating (stars)
      const qLower = q.toLowerCase();
      combined.sort((a, b) => {
        const aText = `${a.ar_title || ''} ${a.en_title || ''}`.toLowerCase();
        const bText = `${b.ar_title || ''} ${b.en_title || ''}`.toLowerCase();

        const aHasExact = aText.includes(qLower);
        const bHasExact = bText.includes(qLower);

        if (aHasExact && !bHasExact) return -1;
        if (!aHasExact && bHasExact) return 1;

        const aStars = parseFloat(a.stars || '0') || 0;
        const bStars = parseFloat(b.stars || '0') || 0;
        if (bStars !== aStars) return bStars - aStars;

        const aYear = parseInt(a.year || '0', 10) || 0;
        const bYear = parseInt(b.year || '0', 10) || 0;
        return bYear - aYear;
      });

      const formatted = combined.slice(0, 30).map((item: any) => ({
        nb: item.nb || item.id,
        ar_title: item.ar_title || item.en_title || 'بدون عنوان',
        en_title: item.en_title || '',
        year: item.year || '',
        stars: item.stars || '0',
        kind: String(item.kind || '1'),
        imgUrl: formatImageUrl(item.img || item.imgThumb),
        ar_content: item.ar_content || item.en_content || '',
      }));

      return NextResponse.json({ success: true, results: formatted });
    }

    if (action === 'popular' || action === 'latest') {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const isSeries = searchParams.get('type') === 'series';

      const data = isSeries ? await getLatestSeries(page) : await getLatestMovies(page);
      const list = Array.isArray(data) ? data : data?.info || [];

      const formatted = list.map((item: any) => ({
        nb: item.nb || item.id,
        ar_title: item.ar_title || item.en_title || 'بدون عنوان',
        en_title: item.en_title || '',
        year: item.year || '',
        stars: item.stars || '0',
        kind: item.kind || (isSeries ? '2' : '1'),
        imgUrl: formatImageUrl(item.img || item.imgThumb),
        ar_content: item.ar_content || '',
      }));

      return NextResponse.json({ success: true, results: formatted });
    }

    if (action === 'banners' || action === 'promo') {
      const banners = await getPromoVideos();
      const list = Array.isArray(banners) ? banners : [];
      const formatted = list.map((item: any) => ({
        nb: String(item.nb || item.id),
        ar_title: item.ar_title || item.title || item.en_title || 'عمل سينمائي مميز',
        en_title: item.en_title || '',
        stars: item.stars || '8.5',
        year: item.year || '2026',
        kind: item.kind || '1',
        ar_content: item.ar_content || item.content || '',
        imgUrl: formatImageUrl(item.imgThumb || item.img),
        coverUrl: item.img ? `/api/img?type=cover&file=${encodeURIComponent(item.img.split('/').pop() || item.img)}` : '',
      }));
      return NextResponse.json({ success: true, results: formatted });
    }

    if (action === 'categories') {
      const cats = await getCategories();
      const list = Array.isArray(cats) ? cats : [];
      const formatted = list.map((c: any) => ({
        id: String(c.nb || c.id || c.categoryID || ''),
        ar_title: c.title || c.ar_title || 'تصنيف',
      }));
      return NextResponse.json({ success: true, categories: formatted });
    }

    if (action === 'category_items') {
      const catId = searchParams.get('id') || '';
      const kind = searchParams.get('kind') || '1';
      const items = await getMoviesByCategory(catId, kind, 0);
      const list = Array.isArray(items) ? items : [];

      const formatted = list.map((item: any) => ({
        nb: item.nb || item.id,
        ar_title: item.ar_title || item.en_title || 'بدون عنوان',
        year: item.year || '',
        stars: item.stars || '0',
        kind: item.kind || kind,
        imgUrl: formatImageUrl(item.img || item.imgThumb),
      }));

      return NextResponse.json({ success: true, results: formatted });
    }

    if (action === 'rooms') {
      const { getActiveRooms } = await import('@/app/actions/room.actions');
      const res = await getActiveRooms();
      return NextResponse.json({ success: true, rooms: res.rooms || [] });
    }

    if (action === 'details') {
      const id = searchParams.get('id') || '';
      if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

      let video = await getVideoDetails(id);
      if (!video) {
        // Fast retry in case of momentary connection latency
        await new Promise((r) => setTimeout(r, 400));
        video = await getVideoDetails(id);
      }

      if (!video) {
        return NextResponse.json({ success: false, error: 'لم يتم العثور على تفاصيل هذا العمل' }, { status: 404 });
      }

      let seasons: any[] = [];
      let episodes: any[] = [];

      // If series or part of a series
      const targetSeriesId = String(video.seriesId || video.fatherId || id).trim();
      const isSeries = video.kind === '2' || Boolean(video.seriesId) || Boolean(video.fatherId);

      if (isSeries) {
        const [s, e] = await Promise.allSettled([
          getSeriesSeasons(targetSeriesId),
          getSeriesEpisodes(targetSeriesId),
        ]);
        if (s.status === 'fulfilled' && Array.isArray(s.value)) seasons = s.value;
        if (e.status === 'fulfilled' && Array.isArray(e.value)) episodes = e.value;
      }

      return NextResponse.json({
        success: true,
        video: {
          ...video,
          kind: isSeries ? '2' : String(video.kind || '1'),
          imgUrl: formatImageUrl(video.img),
          seasons,
          episodes,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Bot API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
