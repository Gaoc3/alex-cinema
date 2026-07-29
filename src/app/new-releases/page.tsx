import { getVideoImageUrl } from '@/utils/imageHelper';
import React from 'react';
import Link from 'next/link';
import NewReleasesPagination from '@/components/NewReleasesPagination';
import { fetchCinemana } from '@/lib/api';

interface VideoItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img: string;
  kind?: string; // '1' for movie, '2' for series
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function NewReleasesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || '1', 10);

  const [moviesRaw, seriesRaw] = await Promise.all([
    fetchCinemana(`latestMovies/level/2/itemsPerPage/30/page/${page}/`),
    fetchCinemana(`latestSeries/level/2/itemsPerPage/30/page/${page}/`)
  ]);

  const movies = Array.isArray(moviesRaw) ? moviesRaw : [];
  const series = Array.isArray(seriesRaw) ? seriesRaw : [];

  // Merge both lists and sort by sequential ID (nb) descending
  const merged = [...movies, ...series].sort(
    (a, b) => parseInt(b.nb) - parseInt(a.nb)
  );

  return (
    <div className="min-h-screen pt-20 sm:pt-24 lg:pt-32 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 animate-fade-in-up">
      {/* Title */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="w-1.5 h-8 sm:h-10 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white drop-shadow-md tracking-wide">الإصدارات الجديدة</h1>
          <p className="text-gray-400 mt-1 text-xs sm:text-sm font-medium">أحدث الأفلام والمسلسلات التي تمت إضافتها مؤخراً على المنصة</p>
        </div>
      </div>

      {merged.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-x-6 gap-y-12">
            {merged.map((video: VideoItem, index) => (
              <Link 
                key={video.nb} 
                href={`/watch/${video.nb}?title=${encodeURIComponent(video.ar_title || video.en_title || '')}`}
                className="group/card block relative snap-start animate-fade-in-up"
                style={{ animationDelay: `${index * 15}ms` }}
              >
                {/* Poster Wrapper */}
                <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                  <img 
                    src={getVideoImageUrl(video, 'poster')}
                    alt={video.ar_title} 
                    className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
                    loading="lazy"
                  />
                  <div className="movie-card-overlay"></div>

                  {/* Play Hover Indicator */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                    <div className="w-14 h-14 rounded-full bg-orange-500/95 flex items-center justify-center text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] backdrop-blur-md">
                      <i className="fa-solid fa-play ml-1 text-xl"></i>
                    </div>
                  </div>
                </div>

                {/* Info Details */}
                <div className="mt-3 px-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <h3 className="text-sm font-bold text-gray-100 group-hover/card:text-white transition-colors truncate flex-grow text-right leading-tight" title={video.ar_title}>
                      {video.ar_title}
                    </h3>

                    <div className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-black text-yellow-400">
                      <span className="font-en mt-0.5">{video.stars}</span>
                      <span className="text-[8px] opacity-70">IMDb</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 leading-none">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px]">
                      {video.kind === '2' ? 'مسلسل' : 'فيلم'}
                    </span>
                    <span>{video.year}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          <NewReleasesPagination 
            currentPage={page} 
            hasNextPage={movies.length >= 30 || series.length >= 30} 
            accentColor="orange"
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 opacity-60">
          <i className="fa-solid fa-fire text-7xl text-gray-600 mb-4 animate-pulse"></i>
          <p className="text-2xl text-gray-400 font-medium">لا توجد إصدارات جديدة حالياً</p>
        </div>
      )}
    </div>
  );
}
