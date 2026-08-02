import { getPromoVideos, getLatestMovies, getLatestSeries, getHomeVideos } from '@/lib/api';
import HeroCarousel from '@/components/HeroCarousel';
import VideoSlider from '@/components/VideoSlider';

interface HomeVideo {
  nb: string;
  ar_title: string;
  en_title?: string;
  ar_content: string;
  img: string;
  imgObjUrl?: string;
  stars: string;
  year: string;
  trailer?: string;
  kind?: string;
  categories?: { ar_title: string }[];
}

export default async function Home() {
  const [promoResult, moviesResult, seriesResult] = await Promise.all([
    getPromoVideos().catch(() => []),
    getLatestMovies(1).catch(() => []),
    getLatestSeries(1).catch(() => []),
  ]);

  let promoVideos: HomeVideo[] = Array.isArray(promoResult) ? promoResult : [];
  let latestMovies: HomeVideo[] = Array.isArray(moviesResult) ? moviesResult : [];
  const latestSeries: HomeVideo[] = Array.isArray(seriesResult) ? seriesResult : [];

  // Fallback to getHomeVideos if latestMovies is empty
  if (latestMovies.length === 0) {
    const homeFallback = await getHomeVideos().catch(() => []);
    if (Array.isArray(homeFallback) && homeFallback.length > 0) {
      latestMovies = homeFallback;
    }
  }

  if (promoVideos.length === 0 && latestMovies.length > 0) {
    promoVideos = latestMovies.slice(0, 5);
  }

  // Sort movies by rating to get "Featured Movies"
  const featuredMovies = [...latestMovies]
    .sort((a, b) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0'));

  // Sort series by rating to get "Featured Series"
  const featuredSeries = [...latestSeries]
    .sort((a, b) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0'));

  const hasAnyContent = promoVideos.length > 0 || latestMovies.length > 0 || latestSeries.length > 0;

  return (
    <div className="animate-fade-in-up pb-20">
      {/* Hero Section Carousel */}
      {promoVideos.length > 0 && (
        <div className="-mt-16 sm:-mt-20 lg:mt-0 relative z-0">
          <HeroCarousel videos={promoVideos} />
        </div>
      )}

      {!hasAnyContent ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center" dir="rtl">
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 text-3xl text-red-400">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white sm:text-3xl">جارٍ تحديث دليل المحتوى</h2>
          <p className="mb-6 max-w-md text-sm leading-7 text-slate-300">
            تعذر جلب القائمة الرئيسية في الوقت الحالي. يرجى تحديث الصفحة للمحاولة مجدداً.
          </p>
          <a
            href="/home"
            className="inline-flex items-center gap-2 rounded-xl bg-[#e50914] px-6 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-red-700 active:scale-98"
          >
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
            إعادة تحميل الصفحة
          </a>
        </div>
      ) : (
        /* Row Sliders */
        <div className="mt-4 sm:mt-6">
          {/* الإصدارات الجديدة */}
          {latestMovies && latestMovies.length > 0 && (
            <VideoSlider 
              title="الإصدارات الجديدة" 
              subtitle="أحدث الإضافات الفنية المضافة مؤخراً للمشاهدة"
              videos={latestMovies} 
              accentColor="red"
            />
          )}

          {/* الأفلام المميزة */}
          {featuredMovies.length > 0 && (
            <VideoSlider 
              title="الأفلام المميزة" 
              subtitle="الأفلام الأعلى تقييماً ونسب مشاهدة من قبل الجمهور"
              videos={featuredMovies} 
              accentColor="red"
            />
          )}

          {/* المسلسلات المميزة */}
          {featuredSeries.length > 0 && (
            <VideoSlider 
              title="المسلسلات المميزة" 
              subtitle="مجموعة من أفضل وأقوى المسلسلات الحائزة على التقييمات الأعلى"
              videos={featuredSeries} 
              accentColor="blue"
            />
          )}
        </div>
      )}
    </div>
  );
}
