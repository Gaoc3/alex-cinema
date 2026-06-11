import { getPromoVideos, getLatestMovies, getLatestSeries } from '@/lib/api';
import HeroCarousel from '@/components/HeroCarousel';
import VideoSlider from '@/components/VideoSlider';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [promoVideos, latestMovies, latestSeries] = await Promise.all([
    getPromoVideos(),
    getLatestMovies(1),
    getLatestSeries(1)
  ]);

  let carouselVideos = [];
  if (promoVideos && promoVideos.length > 0) {
    carouselVideos = promoVideos;
  }

  // Sort movies by rating to get "Featured Movies"
  const featuredMovies = latestMovies 
    ? [...latestMovies].sort((a: any, b: any) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0')) 
    : [];

  // Sort series by rating to get "Featured Series"
  const featuredSeries = latestSeries 
    ? [...latestSeries].sort((a: any, b: any) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0')) 
    : [];

  return (
    <div className="animate-fade-in-up pb-20">
      {/* Hero Section Carousel */}
      {carouselVideos.length > 0 && (
        <div className="-mt-16 sm:-mt-20 lg:mt-0 relative z-0">
          <HeroCarousel videos={carouselVideos} />
        </div>
      )}

      {/* Row Sliders */}
      <div className="mt-12 space-y-6">
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
