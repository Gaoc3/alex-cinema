'use client';

import React, { useEffect, useState } from 'react';
import TelegramMovieCard from './TelegramMovieCard';

interface MovieItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year?: string;
  stars?: string;
  imgUrl: string;
}

interface TelegramMoviesViewProps {
  onSelectMovie: (id: string) => void;
}

export default function TelegramMoviesView({ onSelectMovie }: TelegramMoviesViewProps) {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    async function loadMovies() {
      try {
        const res = await fetch(`/api/bot?action=popular&type=movies&page=${page}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMovies(prev => page === 1 ? (data.results || []) : [...prev, ...(data.results || [])]);
          }
        }
      } catch (err) {
        console.error('Error fetching movies:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMovies();
    return () => {
      isMounted = false;
    };
  }, [page]);

  return (
    <div className="flex flex-col gap-5 pb-32 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
          <i className="fa-solid fa-film text-alex-primary text-xl sm:text-2xl"></i>
          <span>مكتبة الأفلام</span>
        </h1>
        <span className="text-xs sm:text-sm text-gray-400 font-bold">{movies.length} فيلم</span>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {movies.map((movie) => (
          <TelegramMovieCard
            key={movie.nb}
            item={movie}
            onClick={() => onSelectMovie(movie.nb)}
          />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-10 h-10 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={() => setPage(p => p + 1)}
          className="w-full py-4 sm:py-4.5 rounded-2xl bg-[#131a2a] hover:bg-[#1a243a] active:scale-98 border border-white/15 text-sm sm:text-base font-black text-gray-100 transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <i className="fa-solid fa-circle-plus text-alex-primary text-base"></i>
          <span>تحميل المزيد من الأفلام</span>
        </button>
      )}
    </div>
  );
}

