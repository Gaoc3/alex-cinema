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
  try {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    
    // 1. Fetch Room from Database
    const roomRes = await getRoom(resolvedParams.roomId).catch((err) => {
      console.error('Error fetching room in page:', err);
      return { success: false as const, error: 'حدث خطأ أثناء جلب الغرفة' };
    });

    if (!roomRes.success || !roomRes.room) {
      return (
        <div className="flex min-h-[100svh] items-center justify-center bg-[#070a11] p-4 text-white" dir="rtl">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d121d] p-7 text-center shadow-2xl sm:p-10">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-2xl text-red-400">
              <i className="fa-solid fa-ghost" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-2xl font-black">الغرفة غير موجودة</h1>
            <p className="mb-7 text-sm leading-7 text-slate-300">ربما انتهت جلسة المشاهدة أو حُذفت الغرفة.</p>
            <Link href="/rooms" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#e50914] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
              عرض الغرف النشطة
            </Link>
          </div>
        </div>
      );
    }

    const room = roomRes.room;

    // 2. Sync User to get current DB user ID (to check if Host)
    let currentUserId: string | null = null;
    try {
      const userRes = await syncUser();
      currentUserId = userRes.success && userRes.user ? userRes.user.id : null;
    } catch (e) {
      console.error('Error syncing user in room page:', e);
    }

    const isHost = currentUserId === room.hostId;

    // 3. Determine videoId (from URL searchParams first, then DB room.movieId)
    const rawVideoId = resolvedSearchParams.videoId || room.movieId;
    const videoId = typeof rawVideoId === 'string' && rawVideoId.trim() ? rawVideoId.trim() : null;
    
    let video: RoomPageVideo | null = null;
    let seasons: SeriesSeason[] = [];
    let episodes: SeriesEpisode[] = [];

    if (videoId) {
      try {
        video = await getVideoDetails(videoId) as RoomPageVideo | null;
      } catch (e) {
        console.error('Error fetching video details for room:', e);
        video = null;
      }

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
            getSeriesSeasons(seriesId).catch(() => []),
            getSeriesEpisodes(seriesId).catch(() => [])
          ]);
          seasons = Array.isArray(seasonsData) ? seasonsData as SeriesSeason[] : [];
          episodes = Array.isArray(episodesData) ? episodesData as SeriesEpisode[] : [];
        } catch (error) {
          console.error('Error fetching series data for room:', error);
        }
      }
    }

    const safeRoom = JSON.parse(JSON.stringify(room));
    const safeVideo = video ? JSON.parse(JSON.stringify(video)) : null;
    const safeSeasons = JSON.parse(JSON.stringify(seasons));
    const safeEpisodes = JSON.parse(JSON.stringify(episodes));

    return (
      <RoomClientWrapper 
        roomId={resolvedParams.roomId} 
        roomData={safeRoom}
        currentUserId={currentUserId}
        isHostUser={isHost}
        video={safeVideo} 
        seasons={safeSeasons} 
        episodes={safeEpisodes}
      />
    );
  } catch (fatalError) {
    console.error('Fatal error rendering room page:', fatalError);
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#070a11] p-4 text-white" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d121d] p-7 text-center shadow-2xl sm:p-10">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-2xl text-red-400">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-2xl font-black">حدث خطأ أثناء تحميل الغرفة</h1>
          <p className="mb-7 text-sm leading-7 text-slate-300">تعذر تحميل بيانات الجلسة، حاول إعادة التحميل أو العودة إلى قائمة الغرف.</p>
          <Link href="/rooms" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#e50914] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-red-700">
            عرض الغرف النشطة
          </Link>
        </div>
      </div>
    );
  }
}
