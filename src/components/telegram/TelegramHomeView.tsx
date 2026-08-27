'use client';

import React, { useEffect, useState } from 'react';
import TelegramMovieCard from './TelegramMovieCard';
import TelegramHero from './TelegramHero';

interface MovieItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year?: string;
  stars?: string;
  kind?: string;
  imgUrl: string;
  ar_content?: string;
}

interface CategoryItem {
  id: string;
  ar_title: string;
}

interface TelegramHomeViewProps {
  onSelectMovie: (id: string) => void;
  onWatchMovie?: (id: string) => void;
  onOpenDetails?: (id: string) => void;
  onSelectCategory: (catId: string, title: string) => void;
}

export default function TelegramHomeView({
  onSelectMovie,
  onWatchMovie,
  onOpenDetails,
  onSelectCategory,
}: TelegramHomeViewProps) {
  const [heroBanners, setHeroBanners] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<MovieItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MovieItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFeeds() {
      try {
        const timestamp = Date.now();
        const [bannersRes, moviesRes, seriesRes, catsRes] = await Promise.allSettled([
          fetch(`/api/bot?action=banners&t=${timestamp}`, { cache: 'no-store' }),
          fetch(`/api/bot?action=popular&type=movies&page=1&t=${timestamp}`, { cache: 'no-store' }),
          fetch(`/api/bot?action=popular&type=series&page=1&t=${timestamp}`, { cache: 'no-store' }),
          fetch(`/api/bot?action=categories&t=${timestamp}`, { cache: 'no-store' }),
        ]);

        if (isMounted) {
          if (bannersRes.status === 'fulfilled' && bannersRes.value.ok) {
            const data = await bannersRes.value.json();
            if (Array.isArray(data.results) && data.results.length > 0) {
              setHeroBanners(data.results);
            }
          }
          if (moviesRes.status === 'fulfilled' && moviesRes.value.ok) {
            const data = await moviesRes.value.json();
            setPopularMovies(data.results || []);
          }
          if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
            const data = await seriesRes.value.json();
            setPopularSeries(data.results || []);
          }
          if (catsRes.status === 'fulfilled' && catsRes.value.ok) {
            const data = await catsRes.value.json();
            setCategories(data.categories || []);
          }
        }
      } catch (err) {
        console.error('Failed to load TelegramHomeView feeds:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadFeeds();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-12 h-12 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-xs font-bold">جاري تجهيز السينما...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 pb-32 animate-fade-in">
      {/* Real-time Cinemana Live Hero Banner */}
      <TelegramHero
        initialBanners={heroBanners}
        fallbackItems={[...popularMovies.slice(0, 4), ...popularSeries.slice(0, 2)]}
        onSelectMovie={onSelectMovie}
        onWatchMovie={onWatchMovie || onSelectMovie}
        onOpenDetails={onOpenDetails || onSelectMovie}
      />


      {/* Categories Filter Pills */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs sm:text-sm font-black text-gray-300">التصنيفات والأنواع</span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id, cat.ar_title)}
                className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#111827]/85 hover:bg-alex-primary/25 active:scale-95 border border-white/15 hover:border-alex-primary/50 text-xs sm:text-sm text-gray-200 hover:text-white font-black transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                {cat.ar_title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Movies Grid - Directly Plays on Click */}
      {popularMovies.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
              <i className="fa-solid fa-fire text-alex-primary text-base sm:text-lg" />
              <span>الأفلام الأكثر شهرة</span>
            </h2>
            <button
              type="button"
              onClick={() => onSelectCategory('popular-movies', 'الأفلام الأكثر شهرة')}
              className="text-xs sm:text-sm text-alex-primary hover:text-red-400 font-black transition-colors cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-5">
            {popularMovies.map((movie) => (
              <TelegramMovieCard
                key={movie.nb}
                item={movie}
                onClick={() => onSelectMovie(movie.nb)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Popular Series Grid - Directly Plays on Click */}
      {popularSeries.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
              <i className="fa-solid fa-tv text-sky-400 text-base sm:text-lg" />
              <span>المسلسلات الأكثر شهرة</span>
            </h2>
            <button
              type="button"
              onClick={() => onSelectCategory('popular-series', 'المسلسلات الأكثر شهرة')}
              className="text-xs sm:text-sm text-alex-primary hover:text-red-400 font-black transition-colors cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-5">
            {popularSeries.map((s) => (
              <TelegramMovieCard
                key={s.nb}
                item={s}
                onClick={() => onSelectMovie(s.nb)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

