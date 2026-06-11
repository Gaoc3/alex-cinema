import { encodeProxyUrl } from '@/utils/proxyHelper';
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface VideoItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img: string;
  kind?: string; // '1' for movie, '2' for series
}

function NewReleasesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReleases() {
      setLoading(true);
      
      const moviesUrl = `/api/proxy?endpoint=latestMovies/level/2/itemsPerPage/20/page/${page}/`;
      const seriesUrl = `/api/proxy?endpoint=latestSeries/level/2/itemsPerPage/20/page/${page}/`;

      try {
        const [moviesRes, seriesRes] = await Promise.all([
          fetch(moviesUrl),
          fetch(seriesUrl)
        ]);

        let moviesList = [];
        let seriesList = [];

        if (moviesRes.ok) {
          const data = await moviesRes.json();
          moviesList = Array.isArray(data) ? data : [];
        }
        if (seriesRes.ok) {
          const data = await seriesRes.json();
          seriesList = Array.isArray(data) ? data : [];
        }

        // Merge both list and sort by sequential ID (nb) descending
        const merged = [...moviesList, ...seriesList].sort(
          (a, b) => parseInt(b.nb) - parseInt(a.nb)
        );

        setItems(merged);
      } catch (error) {
        console.error('Failed to load new releases:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadReleases();
  }, [page]);

  const setPage = (pageNum: number) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('page', pageNum.toString());
      router.push(`${window.location.pathname}?${params.toString()}`);
    }
  };

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

      {/* Grid Content / Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin mb-4"></div>
          <p className="text-gray-400 font-semibold text-sm">جاري تحميل أحدث الإصدارات...</p>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-12">
            {items.map((video, index) => (
              <Link 
                key={video.nb} 
                href={`/watch/${video.nb}`} 
                className="group/card block relative snap-start animate-fade-in-up"
                style={{ animationDelay: `${index * 15}ms` }}
              >
                {/* Poster Wrapper */}
                <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                  <img 
                    src={`/api/proxy?endpoint=${encodeProxyUrl('https://cnth2.shabakaty.com/vascin-poster-images/' + (video.img))}`} 
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
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-12 sm:mt-16">
            {page > 1 ? (
              <button 
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1.5 sm:gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover-scale cursor-pointer"
              >
                <i className="fa-solid fa-arrow-right"></i>
                <span>السابقة</span>
              </button>
            ) : (
              <div className="opacity-30 flex items-center gap-1.5 sm:gap-2 bg-white/5 text-gray-400 border border-white/5 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm cursor-not-allowed">
                <i className="fa-solid fa-arrow-right"></i>
                <span>السابقة</span>
              </div>
            )}
            
            <div className="glass-panel px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl text-xs sm:text-sm font-black text-gray-200 border border-white/10 shadow-lg">
              <span className="font-en text-orange-500 font-black mx-1">{page}</span>
            </div>

            {items.length >= 35 ? (
              <button 
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1.5 sm:gap-2 bg-orange-500 text-white border border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover-scale cursor-pointer"
              >
                <span>التالية</span>
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            ) : (
              <div className="opacity-30 flex items-center gap-1.5 sm:gap-2 bg-white/5 text-gray-400 border border-white/5 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm cursor-not-allowed">
                <span>التالية</span>
                <i className="fa-solid fa-arrow-left"></i>
              </div>
            )}
          </div>
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

export default function NewReleasesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin mb-4"></div>
        <p className="text-gray-400 font-semibold text-sm">جاري التحميل...</p>
      </div>
    }>
      <NewReleasesContent />
    </Suspense>
  );
}
