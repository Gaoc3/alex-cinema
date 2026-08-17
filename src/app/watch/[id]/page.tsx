import { getVideoImageUrl } from '@/utils/imageHelper';
import { getVideoDetails, getSeriesSeasons, getSeriesEpisodes, searchMovies, fetchCinemana } from '@/lib/api';
import WatchContainer from '@/components/WatchContainer';
import Link from 'next/link';
import type { PlayerStream, RoomVideoData } from '@/components/watch/PlayerSection';
import type { SeriesEpisode, SeriesSeason } from '@/components/watch/SeriesNavigator';

interface WatchStream extends PlayerStream {
  videoUrl: string;
}

type WatchVideo = Omit<RoomVideoData, 'streams'> & Record<string, unknown> & {
  nb: string;
  ar_title: string;
  streams?: WatchStream[];
  en_title?: string;
  fileFile?: string;
  imgObjUrl?: string;
  imgMediumThumb?: string;
  imgThumb?: string;
};

interface WatchEpisode extends SeriesEpisode {
  ar_title: string;
  en_title: string;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WatchPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ title?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  let video = await getVideoDetails(resolvedParams.id) as WatchVideo | null;

  if (!video && resolvedSearchParams.title) {
    try {
      const decodedTitle = decodeURIComponent(resolvedSearchParams.title);
      const searchResults: unknown = await searchMovies(decodedTitle, 'movies');
      let found = Array.isArray(searchResults)
        ? (searchResults as WatchVideo[]).find((movie) => movie.nb === resolvedParams.id)
        : null;
      
      if (!found) {
        const seriesResults: unknown = await searchMovies(decodedTitle, 'series');
        found = Array.isArray(seriesResults) 
          ? (seriesResults as WatchVideo[]).find((movie) => movie.nb === resolvedParams.id)
          : null;
      }
      
      if (found) {
        video = {
          ...found,
          streams: []
        };

        try {
          const streamsData: unknown = await fetchCinemana(`transcoddedFiles/id/${resolvedParams.id}`);
          const recoveredStreams = Array.isArray(streamsData) ? streamsData as WatchStream[] : [];
          video = { ...video, streams: recoveredStreams };

          if (recoveredStreams.length > 0) {
            video.stream_url = recoveredStreams[0].videoUrl;
          } else if (video.fileFile) {
            video.stream_url = `/api/stream-fallback?file=${video.fileFile}`;
          }
        } catch (e) {
          console.error('Error fetching fallback streams:', e);
        }
      }
    } catch (err) {
      console.error('Error in watch page fallback recovery:', err);
    }
  }

  if (!video) {
    try {
      const streamsData: unknown = await fetchCinemana(`transcoddedFiles/id/${resolvedParams.id}`);
      if (Array.isArray(streamsData) && streamsData.length > 0) {
        const streams = streamsData as WatchStream[];
        video = {
          nb: resolvedParams.id,
          ar_title: 'فيلم سينمائي (رابط مباشر)',
          en_title: 'Movie (Direct Link)',
          kind: '1',
          streams: streams,
          stream_url: streams[0].videoUrl
        };
      }
    } catch (e) {
      console.error('Error in watch page direct stream recovery:', e);
    }
  }

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
  let seasons: SeriesSeason[] = [];
  let episodes: WatchEpisode[] = [];
  if (video.kind === '2') {
    try {
      const [seasonsData, episodesData] = await Promise.all([
        getSeriesSeasons(video.nb),
        getSeriesEpisodes(video.nb)
      ]);
      seasons = Array.isArray(seasonsData) ? seasonsData as SeriesSeason[] : [];
      episodes = Array.isArray(episodesData) ? episodesData as WatchEpisode[] : [];
    } catch (e) {
      console.error("Failed to fetch seasons or episodes details:", e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative pt-24 sm:pt-28 md:pt-32 animate-fade-in-up overflow-x-clip z-10">
      <div 
        className="fixed inset-0 z-[-1] opacity-20 blur-[60px] bg-cover bg-center saturate-150 transform scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${getVideoImageUrl(video, 'poster')})` }}
      ></div>

      <div className="max-w-screen-2xl mx-auto px-0 sm:px-6 lg:px-8 py-3 sm:py-10 w-full z-10 flex-grow relative">
        <WatchContainer video={video} seasons={seasons} episodes={episodes} />
      </div>
    </div>
  );
}
