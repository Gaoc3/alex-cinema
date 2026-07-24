import { getActiveRooms } from '@/app/actions/room.actions';
import Link from 'next/link';
import { getImageUrl } from '@/utils/imageHelper';
import Image from 'next/image';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RoomsPage() {
  const res = await getActiveRooms();
  const rooms = res.success && res.rooms ? res.rooms : [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-24 pb-12 relative z-10 min-h-screen" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 drop-shadow-md">
          <i className="fa-solid fa-fire text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"></i>
          الرومات النشطة
        </h1>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
          <i className="fa-regular fa-face-frown text-6xl text-gray-400 mb-6 drop-shadow-lg"></i>
          <h2 className="text-2xl font-black text-white mb-2">لا يوجد رومات عامة نشطة حالياً</h2>
          <p className="text-gray-400 text-center max-w-md">جميع الرومات حالياً إما خاصة أو لا يوجد رومات نشطة. بادر بإنشاء روم وقم بتغيير خصوصيته إلى (عام) لتظهر غرفتك هنا!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map((room: any) => (
            <Link href={`/room/${room.id}`} key={room.id} className="group">
              <div className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-white/5 hover:border-purple-500/50 hover:shadow-[0_10px_30px_rgba(168,85,247,0.2)] transition-all duration-300 relative aspect-[16/10] flex flex-col justify-end group-hover:-translate-y-1 cursor-pointer">
                
                {/* Background Image (Movie Poster) */}
                {room.moviePoster && (
                  <>
                    <Image 
                      src={getImageUrl(room.moviePoster, 'backdrop')} 
                      alt={room.movieTitle || 'Poster'}
                      fill
                      className="absolute inset-0 object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent"></div>
                  </>
                )}

                {/* Content */}
                <div className="relative z-10 p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="bg-purple-600/90 text-white px-2 py-0.5 rounded-lg text-[10px] font-black border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                      يُشاهد الآن
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-300 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                      <i className="fa-solid fa-user-group text-[10px]"></i> انضم
                    </span>
                  </div>
                  
                  <h3 className="text-white font-bold text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                    {room.title}
                  </h3>
                  
                  {room.movieTitle && (
                    <p className="text-gray-400 text-xs line-clamp-1 font-en font-bold">
                      {room.movieTitle}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                    {room.host?.imageUrl ? (
                      <img src={room.host.imageUrl} alt="Host" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <i className="fa-solid fa-user text-[8px] text-gray-400"></i>
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400 font-bold">بواسطة {room.host?.name || 'مجهول'}</span>
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
