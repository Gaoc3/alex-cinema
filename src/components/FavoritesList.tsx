'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/utils/imageHelper';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoritesListProps {
  onItemClick?: () => void;
  compact?: boolean;
}

export default function FavoritesList({ onItemClick, compact = false }: FavoritesListProps) {
  const { favorites, loading, removeFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    return {
      all: favorites.length,
      movie: favorites.filter((f) => f.mediaType === 'movie').length,
      tv: favorites.filter((f) => f.mediaType === 'tv').length,
    };
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    return favorites.filter((item) => {
      if (activeTab !== 'all' && item.mediaType !== activeTab) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        return (item.title || '').toLowerCase().includes(query);
      }
      return true;
    });
  }, [favorites, activeTab, searchQuery]);

  if (loading && favorites.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 gap-3">
        <div className="size-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(229,9,20,0.5)]" />
        <span className="text-xs text-slate-400 font-bold animate-pulse">جاري تحميل المفضلة...</span>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center" dir="rtl">
        <div className="size-20 mb-5 rounded-3xl bg-gradient-to-b from-red-600/20 to-red-950/30 flex items-center justify-center border border-red-500/25 shadow-[0_0_35px_rgba(229,9,20,0.25)]">
          <i className="fa-solid fa-heart-crack text-3xl text-red-500 animate-pulse" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white mb-2">قائمة المفضلة فارغة حالياً</h3>
        <p className="text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed font-medium mb-6">
          لم تقم بإضافة أي أفلام أو مسلسلات لمفضلتك بعد. استكشف المكتبة الضخمة وأضف ما تحب للمشاهدة السريعة!
        </p>
        <Link
          href="/movies"
          onClick={onItemClick}
          className="px-7 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-2xl transition-all shadow-[0_4px_25px_rgba(229,9,20,0.5)] hover:shadow-[0_0_30px_rgba(229,9,20,0.7)] active:scale-95 cursor-pointer text-xs sm:text-sm flex items-center gap-2"
        >
          <i className="fa-solid fa-compass" />
          <span>تصفح مكتبة الأفلام والمسلسلات</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5" dir="rtl">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>الكل</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === 'all' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movie')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'movie'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>أفلام</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === 'movie' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
              {counts.movie}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tv')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tv'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>مسلسلات</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === 'tv' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
              {counts.tv}
            </span>
          </button>
        </div>

        {/* Quick Search inside favorites */}
        {favorites.length > 4 && (
          <div className="relative w-full sm:w-56">
            <i className="fa-solid fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في مفضلتك..."
              className="w-full pr-8 pl-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Favorite Cards or Tab Empty State */}
      {filteredFavorites.length === 0 ? (
        activeTab === 'tv' ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-3xl animate-fade-in">
            <div className="size-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-2xl shadow-[0_0_20px_rgba(56,189,248,0.2)]">
              <i className="fa-solid fa-tv" />
            </div>
            <h4 className="text-base font-black text-white">لا توجد مسلسلات في المفضلة بعد</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              تصفح مكتبة المسلسلات الضخمة وأضف أعمالك المفضلة لمتابعة الحلقات بسهولة!
            </p>
            <Link
              href="/series"
              onClick={onItemClick}
              className="mt-2 px-5 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="fa-solid fa-tv text-xs" />
              <span>تصفح المسلسلات 📺</span>
            </Link>
          </div>
        ) : activeTab === 'movie' ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-3xl animate-fade-in">
            <div className="size-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-2xl shadow-[0_0_20px_rgba(229,9,20,0.2)]">
              <i className="fa-solid fa-film" />
            </div>
            <h4 className="text-base font-black text-white">لا توجد أفلام في المفضلة بعد</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              تصفح مكتبة الأفلام السينمائية وأضف أفضل العروض لمشاهدتها في أي وقت!
            </p>
            <Link
              href="/movies"
              onClick={onItemClick}
              className="mt-2 px-5 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="fa-solid fa-film text-xs" />
              <span>تصفح الأفلام 🎬</span>
            </Link>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs font-bold bg-white/[0.02] border border-white/[0.05] rounded-3xl">
            لا توجد نتائج مطابقة لبحثك في المفضلة.
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5 p-0.5">
          {filteredFavorites.map((fav) => {
            const isSeries = fav.mediaType === 'tv';
            const posterUrl = fav.posterPath ? getImageUrl(fav.posterPath, 'poster') : '/icon.svg';

            return (
              <div
                key={fav.id || fav.mediaId}
                className="relative group/fav-card rounded-2xl overflow-hidden bg-[#070b13] border border-white/10 hover:border-red-500/50 transition-all duration-300 shadow-[0_6px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_10px_30px_rgba(229,9,20,0.25)] hover:-translate-y-1 flex flex-col"
              >
                {/* Watch Poster Link */}
                <Link
                  href={`/watch/${fav.mediaId}`}
                  onClick={onItemClick}
                  className="block relative aspect-[2/3] w-full overflow-hidden bg-[#0a0f1d]"
                >
                  <Image
                    src={posterUrl}
                    alt={fav.title}
                    fill
                    className="object-cover group-hover/fav-card:scale-105 transition-transform duration-500"
                    unoptimized
                  />

                  {/* Cinema Vignette Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-transparent to-black/30 opacity-90 group-hover/fav-card:opacity-100 transition-opacity pointer-events-none" />

                  {/* Series or Movie Badge */}
                  <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-md ${
                      isSeries ? 'bg-red-600 text-white' : 'bg-black/70 backdrop-blur-md border border-white/15 text-slate-200'
                    }`}>
                      {isSeries ? 'مسلسل' : 'فيلم'}
                    </span>
                  </div>

                  {/* Play Center Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/fav-card:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[1px]">
                    <div className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-black shadow-[0_0_20px_rgba(229,9,20,0.6)] flex items-center gap-1.5 transform scale-90 group-hover/fav-card:scale-100 transition-transform">
                      <i className="fa-solid fa-play text-[10px]" />
                      <span>شاهد الآن</span>
                    </div>
                  </div>
                </Link>

                {/* Remove from Favorite Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFavorite(fav.mediaId, fav.mediaType);
                  }}
                  aria-label={`إزالة ${fav.title} من المفضلة`}
                  title="إزالة من المفضلة"
                  className="absolute top-2.5 left-2.5 size-8 rounded-full bg-black/70 hover:bg-red-600 text-white border border-white/20 hover:border-red-500 backdrop-blur-md flex items-center justify-center transition-all duration-200 z-20 cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.6)] active:scale-90 group/btn"
                >
                  <i className="fa-solid fa-heart text-xs text-red-500 group-hover/btn:text-white transition-colors" />
                </button>

                {/* Title and Metadata */}
                <div className="p-3 flex flex-col gap-1">
                  <Link
                    href={`/watch/${fav.mediaId}`}
                    onClick={onItemClick}
                    className="block"
                  >
                    <h4
                      className="text-white font-bold text-xs sm:text-[13px] line-clamp-2 leading-snug group-hover/fav-card:text-red-500 transition-colors text-right"
                      title={fav.title}
                    >
                      {fav.title}
                    </h4>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
