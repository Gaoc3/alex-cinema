'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface TelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramProfileModalProps {
  user: TelegramUser | null;
  onClose: () => void;
  onOpenFavorites: () => void;
  onOpenRooms: () => void;
}

export default function TelegramProfileModal({
  user,
  onClose,
  onOpenFavorites,
  onOpenRooms,
}: TelegramProfileModalProps) {
  const [favoritesCount, setFavoritesCount] = useState<number>(0);

  useEffect(() => {
    fetch('/api/favorites', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const count = Array.isArray(data) ? data.length : (data?.favorites?.length || 0);
        setFavoritesCount(count);
      })
      .catch(() => {});
  }, []);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'مستخدم تليجرام';
  const username = user?.username ? `@${user.username}` : (user?.id ? `ID: ${user.id}` : 'عضو مسجل');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl sm:rounded-4xl bg-[#0e1424] border border-white/20 p-6 sm:p-8 text-white shadow-2xl flex flex-col gap-6 overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-alex-primary/25 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header Close */}
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-black text-alex-primary uppercase tracking-wider">الملف الشخصي</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-200 text-sm transition-all cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#141b30] border border-white/10 shadow-inner">
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gradient-to-br from-alex-primary to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg border-2 border-white/25 flex-shrink-0">
            {user?.photo_url ? (
              <Image
                src={user.photo_url}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span>{displayName.charAt(0)}</span>
            )}
            <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-[#0e1424]"></span>
          </div>

          <div className="overflow-hidden">
            <h3 className="text-lg sm:text-xl font-black text-white truncate">{displayName}</h3>
            <p className="text-xs sm:text-sm text-alex-primary font-bold truncate mt-0.5">{username}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black flex items-center gap-1">
                <i className="fa-solid fa-check text-[10px]" />
                <span>متصل بتليجرام</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFavorites();
            }}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#141b30] hover:bg-[#1a2440] active:scale-95 border border-white/10 flex flex-col items-center justify-center gap-1.5 text-center transition-all shadow-md cursor-pointer"
          >
            <i className="fa-solid fa-bookmark text-alex-primary text-2xl sm:text-3xl mb-1"></i>
            <span className="text-sm sm:text-base font-black text-white">مفضلتي</span>
            <span className="text-xs text-gray-400 font-bold">{favoritesCount} عمل محفوظ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRooms();
            }}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#141b30] hover:bg-[#1a2440] active:scale-95 border border-white/10 flex flex-col items-center justify-center gap-1.5 text-center transition-all shadow-md cursor-pointer"
          >
            <i className="fa-solid fa-users text-red-400 text-2xl sm:text-3xl mb-1"></i>
            <span className="text-sm sm:text-base font-black text-white">الرومات</span>
            <span className="text-xs text-gray-400 font-bold">غرف المشاهدة</span>
          </button>
        </div>

        {/* Account Info Details */}
        <div className="flex flex-col gap-2.5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#141b30]/70 border border-white/10 text-xs sm:text-sm text-gray-300 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-bold">معرّف تليجرام:</span>
            <span className="font-mono text-white font-black">{user?.id || 'غير معروف'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-bold">نوع الحساب:</span>
            <span className="text-yellow-400 font-black flex items-center gap-1">
              <i className="fa-solid fa-star text-xs" />
              <span>عضوية سينمائية مميزة</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-bold">مزامنة السحابة:</span>
            <span className="text-emerald-400 font-black flex items-center gap-1">
              <i className="fa-solid fa-shield-halved text-xs" />
              <span>تلقائية ومحمية</span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 sm:py-4 rounded-2xl bg-alex-primary hover:bg-red-700 active:scale-98 text-white text-sm sm:text-base font-black transition-all shadow-[0_0_24px_rgba(229,9,20,0.5)] cursor-pointer"
        >
          تم
        </button>
      </div>
    </div>
  );
}

