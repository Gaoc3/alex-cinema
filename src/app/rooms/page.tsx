import { getActiveRooms } from '@/app/actions/room.actions';
import Link from 'next/link';
import { getImageUrl } from '@/utils/imageHelper';
import Image from 'next/image';
import CreateRoomButton from '@/components/CreateRoomButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RoomsPage() {
  const res = await getActiveRooms();
  const rooms = res.success && res.rooms ? res.rooms : [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-24 pb-16 relative z-10 min-h-screen" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3 drop-shadow-md">
            <i className="fa-solid fa-fire text-[#E50914] drop-shadow-[0_0_15px_rgba(229,9,20,0.6)] animate-pulse"></i>
            الرومات النشطة
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-1">انضم لغرف المشاهدة المباشرة مع الأصدقاء واستمتع بالمشاهدة والدردشة الفورية</p>
        </div>

        <CreateRoomButton />
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[#0e1424]/80 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
            <i className="fa-solid fa-tv text-3xl text-[#E50914]"></i>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">لا يوجد رومات عامة نشطة حالياً</h2>
          <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
            جميع الرومات حالياً إما خاصة أو لا يوجد رومات نشطة. بادر بإنشاء غرفتك وتشارك الأفلام مع الجميع!
          </p>
          <CreateRoomButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map((room: any) => (
            <Link href={`/room/${room.id}`} key={room.id} className="group">
              <div className="bg-[#0e1424]/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-white/10 hover:border-red-500/50 hover:shadow-[0_10px_35px_rgba(229,9,20,0.3)] transition-all duration-300 relative aspect-[16/11] flex flex-col justify-end group-hover:-translate-y-1.5 cursor-pointer">
                
                {/* Background Image (Movie Poster / Backdrop) */}
                {room.moviePoster ? (
                  <>
                    <Image 
                      src={getImageUrl(room.moviePoster, 'backdrop')} 
                      alt={room.movieTitle || 'Poster'}
                      fill
                      className="absolute inset-0 object-cover opacity-45 group-hover:opacity-65 transition-all duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/80 to-transparent"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#121929] via-[#0a0d17] to-[#180a12]"></div>
                )}

                {/* Status Badges */}
                <div className="absolute top-3.5 inset-x-3.5 z-20 flex items-center justify-between pointer-events-none">
                  <span className="bg-red-600/90 text-white px-2.5 py-1 rounded-xl text-[10px] font-black border border-white/20 shadow-[0_0_12px_rgba(229,9,20,0.5)] flex items-center gap-1.5 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    مباشر 🔴
                  </span>
                  <span className="bg-black/60 text-white px-2.5 py-1 rounded-xl text-xs font-bold backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                    <i className="fa-solid fa-users text-[10px] text-sky-400"></i>
                    انضمام
                  </span>
                </div>

                {/* Content Details */}
                <div className="relative z-10 p-5 flex flex-col gap-2">
                  <h3 className="text-white font-black text-base line-clamp-1 group-hover:text-red-400 transition-colors drop-shadow-md">
                    {room.title}
                  </h3>
                  
                  {room.movieTitle && (
                    <p className="text-gray-300 text-xs line-clamp-1 font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-film text-[10px] text-red-500"></i>
                      <span>{room.movieTitle}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      {room.host?.imageUrl ? (
                        <img src={room.host.imageUrl} alt="Host" className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                          <i className="fa-solid fa-user text-[10px] text-gray-400"></i>
                        </div>
                      )}
                      <span className="text-xs text-gray-300 font-bold truncate">بواسطة {room.host?.name || 'مجهول'}</span>
                    </div>

                    <span className="w-7 h-7 rounded-full bg-red-600/80 group-hover:bg-red-600 text-white flex items-center justify-center text-xs transition-all shadow-md group-hover:scale-110">
                      <i className="fa-solid fa-play mr-0.5 text-[10px]"></i>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
