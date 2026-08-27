'use client';

import React, { useEffect, useState } from 'react';
import TelegramMovieCard from './TelegramMovieCard';

interface SearchResultItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year?: string;
  stars?: string;
  kind?: string;
  imgUrl: string;
}

interface TelegramSearchViewProps {
  onSelectMovie: (id: string) => void;
}

export default function TelegramSearchView({ onSelectMovie }: TelegramSearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/bot?action=search&q=${encodeURIComponent(trimmed)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-5 pb-32 animate-fade-in">
      <div className="relative w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن فيلم أو مسلسل..."
          className="w-full h-14 sm:h-16 pl-12 pr-14 rounded-2xl sm:rounded-3xl bg-[#131a2a] border border-white/20 text-white placeholder-gray-400 text-sm sm:text-base focus:outline-none focus:border-alex-primary focus:ring-2 focus:ring-alex-primary/40 transition-all shadow-xl font-bold"
          autoFocus
        />
        <i className="fa-solid fa-magnifying-glass absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg sm:text-xl"></i>
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-gray-200 text-sm transition-all"
          >
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3.5">
          <div className="w-10 h-10 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-300 text-sm font-bold">جاري البحث في قاعدة البيانات...</p>
        </div>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm sm:text-base">
          <i className="fa-solid fa-film text-4xl mb-3 text-gray-500"></i>
          <p className="font-bold text-gray-200">لا توجد نتائج مطابقة لـ &ldquo;{query}&rdquo;</p>
        </div>
      )}

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {results.map((item) => (
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

