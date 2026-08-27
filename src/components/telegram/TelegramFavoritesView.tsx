'use client';

import React from 'react';
import Image from 'next/image';
import TelegramMovieCard from './TelegramMovieCard';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { useFavorites } from '@/hooks/useFavorites';
import UserAvatar from '@/components/UserAvatar';

interface TelegramFavoritesViewProps {
  onSelectMovie: (id: string) => void;
}

export default function TelegramFavoritesView({ onSelectMovie }: TelegramFavoritesViewProps) {
  const { user, isTelegramUser } = useUnifiedAuth();
  const { favorites: rawFavorites, loading } = useFavorites();

  const favorites = React.useMemo(() => {
    return rawFavorites.map((item) => ({
      nb: String(item.mediaId || item.id),
      ar_title: item.title || 'عمل مفضل',
      stars: '8.0',
      imgUrl: item.posterPath || '/icon.svg',
      kind: item.mediaType === 'tv' ? '2' : '1',
    }));
  }, [rawFavorites]);

  return (
    <div className="flex flex-col gap-6 pb-32 animate-fade-in" dir="rtl">
      {/* Profile Header Card */}
      {user && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-alex-primary/25 via-[#131a2a] to-[#0e1424] border border-white/15 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/25 shadow-xl flex-shrink-0 bg-[#0b0f19]">
              <UserAvatar imageUrl={user.imageUrl} name={user.name} className="size-full text-xl sm:text-2xl" />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0e1424]"></span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">{user.name}</h2>
              <span className="text-xs sm:text-sm text-sky-400 font-bold flex items-center gap-1.5 mt-1">
                <i className={isTelegramUser ? 'fa-brands fa-telegram text-sm sm:text-base' : 'fa-solid fa-user-shield text-sm sm:text-base'}></i>
                <span>{isTelegramUser ? 'حساب تليجرام موثق' : 'حساب أليكس سينما'}</span>
              </span>
            </div>
          </div>

          <div className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center shadow-md">
            <span className="text-xs text-gray-300 block font-bold">المفضلة</span>
            <span className="text-base sm:text-lg font-black text-alex-primary">{favorites.length}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
          <i className="fa-solid fa-bookmark text-alex-primary text-xl sm:text-2xl"></i>
          <span>قائمة مفضلاتي</span>
        </h1>
        <span className="text-xs sm:text-sm text-gray-400 font-bold">{favorites.length} عمل</span>
      </div>

      {loading && (
        <div className="flex justify-center py-14">
          <div className="w-10 h-10 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="text-center py-20 text-gray-400 text-sm sm:text-base flex flex-col items-center gap-3">
          <i className="fa-regular fa-bookmark text-5xl text-gray-600 mb-2"></i>
          <p className="font-black text-gray-200 text-base sm:text-lg">لا توجد أعمال في المفضلة بعد</p>
          <span className="text-xs sm:text-sm text-gray-400 font-medium">أضف أفلامك ومسلسلاتك المفضلة لتصل إليها بسرعة هنا!</span>
        </div>
      )}

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {favorites.map((item) => (
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
