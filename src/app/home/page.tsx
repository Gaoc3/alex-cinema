import { getHeroBanner, getVideoGroups, getNewlyVideos, getLatestMovies, getLatestSeries, getHomeVideos } from '@/lib/api';
import HeroCarousel from '@/components/HeroCarousel';
import VideoSlider from '@/components/VideoSlider';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface HomeVideo {
  nb: string;
  ar_title: string;
  en_title?: string;
  ar_content?: string;
  img: string;
  imgObjUrl?: string;
  stars: string;
  year: string;
  trailer?: string;
  kind?: string;
  categories?: { ar_title: string }[];
}

interface VideoGroup {
  title: string;
  content: HomeVideo[];
}

export default async function Home() {
  const headersList = await headers();
  const userAgent = (headersList.get('user-agent') || '').toLowerCase();
  if (userAgent.includes('telegram')) {
    redirect('/tg-app');
  }

  const [bannerResult, newlyResult, groupsResult, moviesResult, seriesResult] = await Promise.all([
    getHeroBanner().catch(() => []),
    getNewlyVideos(0).catch(() => []),
    getVideoGroups().catch(() => null),
    getLatestMovies(1, 24).catch(() => []),
    getLatestSeries(1, 24).catch(() => []),
  ]);

  let promoVideos: HomeVideo[] = Array.isArray(bannerResult) ? bannerResult : [];
  const newlyVideos: HomeVideo[] = Array.isArray(newlyResult) ? newlyResult : [];
  const videoGroups: VideoGroup[] = Array.isArray(groupsResult?.groups) ? groupsResult.groups : [];
  let latestMovies: HomeVideo[] = Array.isArray(moviesResult) ? moviesResult : [];
  const latestSeries: HomeVideo[] = Array.isArray(seriesResult) ? seriesResult : [];

  // Fallback to getHomeVideos if latestMovies is empty
  if (latestMovies.length === 0) {
    const homeFallback = await getHomeVideos().catch(() => []);
    if (Array.isArray(homeFallback) && homeFallback.length > 0) {
      latestMovies = homeFallback;
    }
  }

  if (promoVideos.length === 0) {
    if (newlyVideos.length > 0) {
      promoVideos = newlyVideos.slice(0, 6);
    } else if (latestMovies.length > 0) {
      promoVideos = latestMovies.slice(0, 6);
    }
  }

  const hasAnyContent = promoVideos.length > 0 || newlyVideos.length > 0 || videoGroups.length > 0 || latestMovies.length > 0 || latestSeries.length > 0;

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
        <div className="mt-4 sm:mt-6 space-y-2">
          {/* أحدث الإصدارات المضافة */}
          {newlyVideos && newlyVideos.length > 0 && (
            <VideoSlider 
              title="الإصدارات الجديدة الحصرية" 
              subtitle="أحدث الأفلام والمسلسلات المضافة مؤخراً بجودة عالية"
              videos={newlyVideos} 
              accentColor="red"
            />
          )}

          {/* المجموعات السينمائية المنسقة (Curated Video Groups) */}
          {videoGroups.map((group, idx) => {
            if (!group.content || group.content.length === 0) return null;
            // Alternate colors for variety
            const colors: ('red' | 'blue' | 'purple')[] = ['red', 'blue', 'purple'];
            const accent = colors[idx % colors.length];
            return (
              <VideoSlider 
                key={group.title + idx}
                title={group.title} 
                subtitle="مختارات سينمائية منتقاة خصيصاً للمشاهدة"
                videos={group.content} 
                accentColor={accent}
              />
            );
          })}

          {/* أحدث الأفلام */}
          {latestMovies && latestMovies.length > 0 && (
            <VideoSlider 
              title="أحدث الأفلام" 
              subtitle="أحدث الأفلام السينمائية العالمية والعربية"
              videos={latestMovies} 
              accentColor="red"
            />
          )}

          {/* أحدث المسلسلات */}
          {latestSeries && latestSeries.length > 0 && (
            <VideoSlider 
              title="أحدث المسلسلات والحلقات" 
              subtitle="مجموعة من أحدث المسلسلات التلفزيونية والحلقات المتجددة"
              videos={latestSeries} 
              accentColor="blue"
            />
          )}
        </div>
      )}
    </div>
  );
}
