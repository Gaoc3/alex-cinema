import { getActiveRooms } from '@/app/actions/room.actions';
import Link from 'next/link';
import { getImageUrl } from '@/utils/imageHelper';
import Image from 'next/image';
import CreateRoomButton from '@/components/CreateRoomButton';
import UserAvatar from '@/components/UserAvatar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ActiveRoom {
  id: string;
  title: string;
  movieTitle: string | null;
  moviePoster: string | null;
  host: {
    name: string | null;
    imageUrl: string | null;
  } | null;
}

export default async function RoomsPage() {
  const res = await getActiveRooms();
  const rooms = res.success && res.rooms ? res.rooms : [];
  const loadError = res.success ? null : res.error;

  return (
    <div
      className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 xl:px-8 xl:pt-28"
      dir="rtl"
    >
      <div className="mb-7 flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-5 sm:mb-8 sm:flex-row sm:items-center sm:pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-3 text-2xl font-black text-white drop-shadow-md sm:text-4xl">
              <i className="fa-solid fa-fire text-[#E50914] drop-shadow-[0_0_15px_rgba(229,9,20,0.6)] motion-safe:animate-pulse" aria-hidden="true" />
              الغرف النشطة
            </h1>
            {!loadError && rooms.length > 0 && (
              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">
                {rooms.length} {rooms.length === 1 ? 'غرفة' : 'غرف'}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            انضم إلى مشاهدة مباشرة مع الأصدقاء، وشارك اللحظة والدردشة في الوقت نفسه.
          </p>
        </div>

        <CreateRoomButton />
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-col items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-950/15 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-2xl text-amber-300">
            <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-black text-white sm:text-2xl">تعذر تحميل الغرف الآن</h2>
          <p className="mb-6 mt-2 max-w-md text-sm font-semibold leading-6 text-slate-400">
            {loadError || 'حدث خطأ مؤقت أثناء جلب الغرف النشطة.'}
          </p>
          <a
            href="/rooms"
            className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            إعادة المحاولة
          </a>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0e1424]/80 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10 lg:p-16">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-2xl text-[#E50914] shadow-[0_0_30px_rgba(229,9,20,0.2)] sm:size-20 sm:text-3xl">
            <i className="fa-solid fa-tv" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-black text-white sm:text-2xl">لا توجد غرف عامة نشطة حاليًا</h2>
          <p className="mb-7 mt-2 max-w-md text-sm leading-6 text-slate-400">
            أنشئ غرفتك وابدأ مشاهدة فيلم أو مسلسل مع أصدقائك في لحظات.
          </p>
          <CreateRoomButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 2xl:grid-cols-4">
          {(rooms as ActiveRoom[]).map((room) => {
            const primaryTitle = room.movieTitle || room.title;
            const hasSecondaryTitle = room.movieTitle && room.title && room.movieTitle !== room.title;

            return (
              <Link
                href={`/room/${room.id}`}
                key={room.id}
                className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#070a13]"
              >
                <article className="relative flex min-h-60 cursor-pointer flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-[#0e1424]/90 shadow-xl backdrop-blur-xl transition duration-300 group-hover:-translate-y-1.5 group-hover:border-red-500/50 group-hover:shadow-[0_14px_40px_rgba(229,9,20,0.25)] sm:min-h-64">
                  {room.moviePoster ? (
                    <>
                      <Image
                        src={getImageUrl(room.moviePoster, 'backdrop')}
                        alt={primaryTitle ? `خلفية ${primaryTitle}` : ''}
                        fill
                        sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, (max-width: 1535px) 33vw, 25vw"
                        className="absolute inset-0 object-cover opacity-50 transition duration-500 group-hover:scale-105 group-hover:opacity-70 motion-reduce:transform-none"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#090d16]/85 to-black/5" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(229,9,20,0.18),transparent_38%),linear-gradient(135deg,#121929,#080b13_55%,#180a12)]" />
                  )}

                  <div className="pointer-events-none absolute inset-x-3.5 top-3.5 z-20 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-red-600/90 px-2.5 py-1 text-[0.68rem] font-black text-white shadow-[0_0_14px_rgba(229,9,20,0.45)] backdrop-blur-md">
                      <span className="size-2 rounded-full bg-white motion-safe:animate-pulse" />
                      مباشر
                    </span>
                    <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1 text-[0.68rem] font-bold text-slate-100 backdrop-blur-md">
                      <i className="fa-solid fa-users text-[0.62rem] text-sky-400" aria-hidden="true" />
                      متاحة الآن
                    </span>
                  </div>

                  <div className="relative z-10 flex flex-col gap-2 p-5">
                    <p className="text-[0.68rem] font-black tracking-wide text-red-300">غرفة مشاهدة مباشرة</p>
                    <h2 className="line-clamp-2 text-lg font-black leading-7 text-white drop-shadow-md transition-colors group-hover:text-red-300">
                      {primaryTitle}
                    </h2>

                    {hasSecondaryTitle && (
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                        <i className="fa-solid fa-door-open text-[0.62rem] text-red-400" aria-hidden="true" />
                        <span className="line-clamp-1">{room.title}</span>
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          imageUrl={room.host?.imageUrl}
                          name={room.host?.name}
                          className="size-7 border border-white/20"
                        />
                        <span className="truncate text-xs font-bold text-slate-300">
                          بواسطة {room.host?.name || 'مستخدم أليكس'}
                        </span>
                      </div>

                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-600/90 text-xs text-white shadow-md transition group-hover:scale-110 group-hover:bg-red-500 motion-reduce:transform-none">
                        <i className="fa-solid fa-play translate-x-px text-[0.62rem]" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
