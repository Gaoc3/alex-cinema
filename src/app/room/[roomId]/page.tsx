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

    // Unauthenticated User Auth Guard: prompt to sign in and redirect back to this room
    if (!currentUserId) {
      const roomTitle = room.movieTitle || room.title || 'غرفة مشاهدة جماعية';
      const redirectUrl = `/room/${resolvedParams.roomId}`;

      return (
        <div className="flex min-h-[100svh] items-center justify-center bg-[#070a11] p-4 text-white" dir="rtl">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-500/30 bg-[#0d121d] p-7 text-center shadow-2xl backdrop-blur-md sm:p-10">
            <div className="absolute -top-20 -right-20 size-48 rounded-full bg-red-600/15 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-blue-600/15 blur-[60px] pointer-events-none" />

            <div className="relative z-10 mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl border border-red-500/40 bg-red-500/10 text-3xl text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
              <i className="fa-solid fa-user-lock" aria-hidden="true" />
            </div>

            <span className="relative z-10 inline-block rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 text-xs font-black text-red-300 mb-3">
              المشاهدة الجماعية
            </span>

            <h1 className="relative z-10 mb-2 text-2xl font-black text-white sm:text-3xl">
              تسجيل الدخول مطلوب
            </h1>

            <p className="relative z-10 mb-7 text-sm leading-7 text-slate-300">
              أهلاً بك! ينبغي تسجيل الدخول أو إنشاء حساب للانضمام لـ <strong className="text-white font-black">{roomTitle}</strong> والاستمتاع بالمشاهدة والدردشة المباشرة مع باقي الحاضرين.
            </p>

            <div className="relative z-10 flex flex-col gap-3">
              <Link
                href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
                className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 active:scale-98 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 cursor-pointer"
              >
                <i className="fa-solid fa-right-to-bracket text-xs" />
                <span>تسجيل الدخول / إنشاء حساب</span>
              </Link>

              <Link
                href="/rooms"
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 active:scale-98 cursor-pointer"
              >
                <span>استكشاف الغرف العامة النشطة</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    const isHost = currentUserId === room.hostId;

    // 3. Determine videoId (from URL searchParams first, then DB room.movieId)
    const rawVideoId = resolvedSearchParams.videoId || room.movieId;
    const videoId = typeof rawVideoId === 'string' && rawVideoId.trim() ? rawVideoId.trim() : null;
    
    let video: RoomPageVideo | null = null;
    let seasons: SeriesSeason[] = [];
    let episodes: SeriesEpisode[] = [];

    if (videoId) {
      const fallbackTitle = (typeof resolvedSearchParams.title === 'string' && resolvedSearchParams.title.trim())
        || (room.movieTitle && room.movieTitle.trim())
        || 'عمل سينمائي';

      try {
        video = await getVideoDetails(videoId) as RoomPageVideo | null;
        if (video) {
          if (!video.ar_title || video.ar_title.includes('(روم)')) {
            video.ar_title = video.ar_title || video.en_title || fallbackTitle;
          }
        }
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
              ar_title: fallbackTitle,
              en_title: fallbackTitle,
              kind: room.kind || '1',
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
