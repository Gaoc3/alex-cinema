import { getVideoImageUrl } from '@/utils/imageHelper';
import { getVideoDetails, getSeriesSeasons, getSeriesEpisodes } from '@/lib/api';
import WatchContainer from '@/components/WatchContainer';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const video = await getVideoDetails(resolvedParams.id);

  if (!video) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh] animate-fade-in-up">
        <div className="text-center ios-glass p-12 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0e17]/80"></div>
          <i className="fa-solid fa-triangle-exclamation text-6xl text-alex-primary mb-6 drop-shadow-lg relative z-10 animate-pulse"></i>
          <h1 className="text-3xl font-black text-white relative z-10 mb-2">عذراً، لم نتمكن من جلب تفاصيل الفيديو</h1>
          <p className="text-gray-400 mb-8 relative z-10">قد يكون الرابط خاطئاً أو تم حذف المحتوى من المصدر.</p>
          <Link href="/" className="inline-block btn-primary px-8 py-3.5 rounded-xl text-white font-bold shadow-lg hover-scale relative z-10">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  // Fetch seasons and episodes if the video is a series (kind === '2')
  let seasons: any[] = [];
  let episodes: any[] = [];
  if (video.kind === '2') {
    try {
      const [seasonsData, episodesData] = await Promise.all([
        getSeriesSeasons(video.nb),
        getSeriesEpisodes(video.nb)
      ]);
      seasons = Array.isArray(seasonsData) ? seasonsData : [];
      episodes = Array.isArray(episodesData) ? episodesData : [];
    } catch (e) {
      console.error("Failed to fetch seasons or episodes details:", e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative pt-24 animate-fade-in-up overflow-x-hidden">
      <div 
        className="fixed inset-0 z-[-1] opacity-20 blur-[60px] bg-cover bg-center saturate-150 transform scale-110"
        style={{ backgroundImage: `url(${getVideoImageUrl(video as any, 'poster')})` }}
      ></div>

      <div className="max-w-screen-2xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-10 w-full z-10 flex-grow">
        <WatchContainer video={video} seasons={seasons} episodes={episodes} />
      </div>
    </div>
  );
}

