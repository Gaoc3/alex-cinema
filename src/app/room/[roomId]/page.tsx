import { getVideoDetails, getSeriesSeasons, getSeriesEpisodes, fetchCinemana } from '@/lib/api';
import RoomClientWrapper from './RoomClientWrapper';
import Link from 'next/link';
import { getRoom } from '@/app/actions/room.actions';
import { syncUser } from '@/app/actions/user.actions';
import type { PlayerStream, RoomVideoData } from '@/components/watch/PlayerSection';
import type { SeriesEpisode, SeriesSeason } from '@/components/watch/SeriesNavigator';

type RoomPageVideo = RoomVideoData & { en_title?: string };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RoomPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ roomId: string }>,
  searchParams: Promise<{ videoId?: string, create?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // 1. Fetch Room from Database
  const roomRes = await getRoom(resolvedParams.roomId);
  if (!roomRes.success || !roomRes.room) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-12 bg-red-900/10 border border-red-500/20 rounded-3xl backdrop-blur-md">
          <i className="fa-solid fa-ghost text-6xl text-red-500/80 mb-6 drop-shadow-lg"></i>
          <h1 className="text-3xl font-black text-white mb-2">الروم غير موجود</h1>
          <p className="text-gray-400 mb-8">عذراً، هذا الروم غير موجود في قاعدة البيانات أو تم حذفه.</p>
          <Link href="/" className="btn-primary px-8 py-3.5 rounded-xl text-white font-bold inline-block">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const room = roomRes.room;

  // 2. Sync User to get current DB user ID (to check if Host)
  const userRes = await syncUser();
  const currentUserId = userRes.success && userRes.user ? userRes.user.id : null;
  const isHost = currentUserId === room.hostId;

  // 3. Determine videoId (from URL searchParams first, then DB room.movieId)
  const videoId = resolvedSearchParams.videoId || room.movieId;
  
  let video: RoomPageVideo | null = null;
  let seasons: SeriesSeason[] = [];
  let episodes: SeriesEpisode[] = [];

  if (videoId) {
    video = await getVideoDetails(videoId) as RoomPageVideo | null;

    if (!video) {
      try {
        const streamsData: unknown = await fetchCinemana(`transcoddedFiles/id/${videoId}`);
        if (Array.isArray(streamsData) && streamsData.length > 0) {
          const streams = streamsData as PlayerStream[];
          video = {
            nb: videoId,
            ar_title: 'فيلم سينمائي (روم)',
            en_title: 'Movie Room',
            kind: '1',
            streams: streams,
            stream_url: streams[0].videoUrl
          };
        }
      } catch (e) {
        console.error('Error in room page direct stream recovery:', e);
      }
    }

    // Fetch seasons and episodes if the video is a series (kind === '2')
    if (video && video.kind === '2') {
      try {
        const seriesId = String(video.nb || video.id || videoId);
        const [seasonsData, episodesData] = await Promise.all([
          getSeriesSeasons(seriesId),
          getSeriesEpisodes(seriesId)
        ]);
        seasons = Array.isArray(seasonsData) ? seasonsData as SeriesSeason[] : [];
        episodes = Array.isArray(episodesData) ? episodesData as SeriesEpisode[] : [];
      } catch (error) {
        console.error('Error fetching series data for room:', error);
      }
    }
  }

  return (
    <RoomClientWrapper 
      roomId={resolvedParams.roomId} 
      roomData={room}
      currentUserId={currentUserId}
      isHostUser={isHost}
      video={video} 
      seasons={seasons} 
      episodes={episodes}
    />
  );
}
