'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/utils/imageHelper';
import FavoriteButton from '@/components/FavoriteButton';
import { useFavorites } from '@/hooks/useFavorites';

export default function FavoritesList() {
  const { favorites, loading } = useFavorites();

  const handleBrowse = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/movies';
  };

  if (loading && favorites.length === 0) {
    return (
      <div className="w-full flex items-center justify-center p-12">
        <div className="size-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
        <div className="size-16 mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
          <i className="fa-regular fa-bookmark text-3xl text-slate-500"></i>
        </div>
        <h3 className="text-xl font-black text-white mb-2">لا توجد أعمال في المفضلة بعد</h3>
        <p className="text-slate-400 text-sm max-w-[260px] leading-relaxed font-medium">
          قم بإضافة أفلام ومسلسلات إلى مفضلتك لتصل إليها وتشاهدها بسرعة لاحقاً!
        </p>
        <button
          type="button"
          onClick={handleBrowse}
          className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all shadow-[0_4px_18px_rgba(229,9,20,0.5)] active:scale-95 cursor-pointer text-xs sm:text-sm"
        >
          تصفح الأعمال الآن
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4 p-1 rtl" dir="rtl">
      {favorites.map((fav) => {
        const isSeries = fav.mediaType === 'tv';
        const posterUrl = fav.posterPath ? getImageUrl(fav.posterPath, 'poster') : '/icon.svg';

        return (
          <div
            key={fav.id || fav.mediaId}
            className="relative group rounded-2xl overflow-hidden shadow-lg bg-[#0a0f1d] border border-white/10 hover:border-red-500/60 transition-all duration-300 flex flex-col"
          >
            {/* Watch Link */}
            <Link
              href={`/watch/${fav.mediaId}`}
              className="block relative aspect-[2/3] w-full overflow-hidden bg-[#070b13]"
            >
              <Image
                src={posterUrl}
                alt={fav.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none" />

              {/* Series or Movie Badge */}
              <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-md ${
                  isSeries ? 'bg-red-600 text-white' : 'bg-white/20 backdrop-blur-md text-white'
                }`}>
                  {isSeries ? 'مسلسل' : 'فيلم'}
                </span>
              </div>

              {/* Play Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40">
                <div className="size-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl">
                  <i className="fa-solid fa-play text-xs mr-0.5" />
                </div>
              </div>
            </Link>

            {/* Title Row */}
            <div className="p-2.5 flex flex-col gap-1">
              <Link href={`/watch/${fav.mediaId}`}>
                <h4 className="text-white font-black text-xs line-clamp-1 leading-tight hover:text-red-500 transition-colors" title={fav.title}>
                  {fav.title}
                </h4>
              </Link>
            </div>

            {/* Favorite Remove Button */}
            <div className="absolute top-2 left-2 z-20">
              <FavoriteButton
                mediaId={fav.mediaId}
                mediaType={fav.mediaType as 'movie' | 'tv'}
                title={fav.title}
                posterPath={fav.posterPath}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
