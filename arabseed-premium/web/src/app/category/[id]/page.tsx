import { getMoviesByCategory } from '@/lib/api';
import Link from 'next/link';

// We need to implement getMoviesByCategory in lib/api.ts
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const videos = await getMoviesByCategory(resolvedParams.id);

  return (
    <div className="min-h-screen pt-32 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      
      <div className="flex items-center gap-4 mb-10">
        <div className="w-1.5 h-8 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
        <h1 className="text-3xl font-black text-white drop-shadow-md tracking-wide">
          أفلام التصنيف
        </h1>
      </div>

      {videos && videos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-12">
          {videos.map((video: any, index: number) => (
            <Link 
              key={video.nb} 
              href={`/watch/${video.nb}`} 
              className="group/card block relative snap-start"
              style={{ animationDelay: `${index * 25}ms` }}
            >
              {/* Poster Wrapper */}
              <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                <img 
                  src={`https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=${encodeURIComponent(\'https://cnth2.shabakaty.com/vascin-poster-images/' + (video.img || video.imgMediumThumb || video.imgThumb))}`} 
                  alt={video.ar_title} 
                  className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
                  loading="lazy"
                />
                <div className="movie-card-overlay"></div>

                {/* Play Hover Indicator */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                  <div className="w-14 h-14 rounded-full bg-alex-primary/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] backdrop-blur-md">
                    <i className="fa-solid fa-play ml-1 text-xl"></i>
                  </div>
                </div>
              </div>

              {/* Info Details directly below the poster */}
              <div className="mt-3 px-1 space-y-1.5">
                {/* Rating & Title Row */}
                <div className="flex items-center justify-between gap-2.5">
                  <h3 className="text-sm font-bold text-gray-100 group-hover/card:text-white transition-colors truncate flex-grow text-right leading-tight" title={video.ar_title}>
                    {video.ar_title}
                  </h3>

                  <div className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-black text-yellow-400">
                    <span className="font-en mt-0.5">{video.stars}</span>
                    <span className="text-[8px] opacity-70">IMDb</span>
                  </div>
                </div>

                {/* Year Row */}
                <div className="flex items-center text-[11px] font-semibold text-gray-400 justify-end gap-1.5 leading-none">
                  <span>{video.year}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-60">
          <i className="fa-solid fa-film text-6xl text-gray-600 mb-4"></i>
          <p className="text-xl text-gray-400 font-medium">لا توجد أعمال في هذا التصنيف حالياً</p>
        </div>
      )}
    </div>
  );
}
