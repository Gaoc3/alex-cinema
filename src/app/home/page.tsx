import { getPromoVideos, getLatestMovies, getLatestSeries } from '@/lib/api';
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
    getPromoVideos(),
    getLatestMovies(1),
    getLatestSeries(1)
  ]);
  const promoVideos: HomeVideo[] = Array.isArray(promoResult) ? promoResult : [];
  const latestMovies: HomeVideo[] = Array.isArray(moviesResult) ? moviesResult : [];
  const latestSeries: HomeVideo[] = Array.isArray(seriesResult) ? seriesResult : [];

  // Sort movies by rating to get "Featured Movies"
  const featuredMovies = [...latestMovies]
    .sort((a, b) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0'));

  // Sort series by rating to get "Featured Series"
  const featuredSeries = [...latestSeries]
    .sort((a, b) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0'));

  return (
    <div className="animate-fade-in-up pb-20">
      {/* Hero Section Carousel */}
      {promoVideos.length > 0 && (
        <div className="-mt-16 sm:-mt-20 lg:mt-0 relative z-0">
          <HeroCarousel videos={promoVideos} />
        </div>
      )}

      {/* Row Sliders */}
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
    </div>
  );
}
