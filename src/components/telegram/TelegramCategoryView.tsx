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

interface TelegramCategoryViewProps {
  categoryId: string;
  categoryTitle: string;
  onBack: () => void;
  onSelectMovie: (id: string) => void;
}

export default function TelegramCategoryView({
  categoryId,
  categoryTitle,
  onBack,
  onSelectMovie,
}: TelegramCategoryViewProps) {
  const [items, setItems] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadCategory() {
      try {
        const res = await fetch(`/api/bot?action=category_items&id=${encodeURIComponent(categoryId)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setItems(data.results || []);
        }
      } catch (err) {
        console.error('Category load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCategory();
    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  return (
    <div className="flex flex-col gap-5 pb-32 animate-fade-in">
      <div className="flex items-center gap-3.5 px-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="رجوع"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white text-base transition-all border border-white/15 cursor-pointer shadow-md"
        >
          <i className="fa-solid fa-arrow-right"></i>
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-white">{categoryTitle}</h1>
        <span className="text-xs sm:text-sm text-gray-400 font-bold mr-auto">{items.length} عمل</span>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {items.map((item) => (
          <TelegramMovieCard
            key={item.nb}
            item={item}
            onClick={() => onSelectMovie(item.nb)}
          />
        ))}
      </div>
    </div>
  );
}

