'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { useAuth } from '@clerk/nextjs';
import { useFavorites } from '@/hooks/useFavorites';
import toast from 'react-hot-toast';
import { useTelegramSafeArea } from '@/lib/telegramWebAppClient';

interface TelegramDetailsSheetProps {
  movieId: string | null;
  onClose: () => void;
  onWatch: (movieId: string) => void;
}

export type SheetSnap = 'half' | 'full';

export default function TelegramDetailsSheet({
  movieId,
  onClose,
  onWatch,
}: TelegramDetailsSheetProps) {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<any | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState<string>('1');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Pure Gesture Snap State ('half' vs 'full')
  const [snap, setSnap] = useState<SheetSnap>('half');
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { isSignedIn, isLoaded, user } = useUnifiedAuth();
  const { getToken } = useAuth();
  const { safeArea } = useTelegramSafeArea();

  const fetchDetails = useCallback(async (id: string, attempt = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bot?action=details&id=${encodeURIComponent(id)}&t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
          return fetchDetails(id, attempt + 1);
        }
        throw new Error('تعذر تحميل تفاصيل العمل من الخادم');
      }

      const data = await res.json();
      if (!data.success || !data.video) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
          return fetchDetails(id, attempt + 1);
        }
        throw new Error(data.error || 'لم يتم العثور على بيانات هذا العمل');
      }

      setVideo(data.video);
      const sList = data.video.seasons || [];
      const eList = data.video.episodes || [];
      setSeasons(sList);
      setEpisodes(eList);
      if (sList.length > 0) {
        setActiveSeason(String(sList[0].season || '1').trim());
      } else if (eList.length > 0) {
        setActiveSeason(String(eList[0].season || '1').trim());
      }
    } catch (err: any) {
      console.error('[TelegramDetailsSheet Error]:', err);
      setError(err.message || 'حدث خطأ في تحميل التفاصيل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!movieId) return;

    setVideo(null);
    setSeasons([]);
    setEpisodes([]);
    setSnap('half');
    setDragOffsetY(0);
    setIsClosing(false);

    document.body.style.overflow = 'hidden';
    void fetchDetails(movieId);

    return () => {
      document.body.style.overflow = '';
    };
  }, [movieId, fetchDetails, retryCount]);

  // Normalized list of seasons
  const seasonList = useMemo(() => {
    if (seasons.length > 0) {
      return seasons.map((s) => ({
        season: String(s.season || s).trim(),
      }));
    }
    if (episodes.length > 0) {
      const extracted = Array.from(new Set(episodes.map((e) => String(e.season || '1').trim())))
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b));
      return extracted.map((s) => ({ season: s }));
    }
    return [];
  }, [seasons, episodes]);

  // Episodes for current selected season
  const currentSeasonEpisodes = useMemo(() => {
    return episodes
      .filter((ep) => String(ep.season || '1').trim() === String(activeSeason).trim())
      .sort((a, b) => Number(a.episodeNummer || a.episodeNumber || a.episode_num || 0) - Number(b.episodeNummer || b.episodeNumber || b.episode_num || 0));
  }, [episodes, activeSeason]);

  // Centralized instant favorites
  const { isFavorite: checkIsFav, toggleFavorite: toggleFav } = useFavorites();
  const isFavorite = video ? checkIsFav(video.nb, video.kind === '2' ? 'tv' : 'movie') : false;

  const toggleFavorite = async () => {
    if (!video) return;
    await toggleFav({
      mediaId: video.nb,
      mediaType: video.kind === '2' ? 'tv' : 'movie',
      title: video.ar_title || video.en_title || 'عمل فني',
      posterPath: video.img || null,
    });
  };

  const handleCloseSmoothly = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280);
  }, [onClose]);

  // Touch Drag & Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    dragCurrentY.current = currentY;
    const diff = currentY - dragStartY.current;

    // When snap is 'full' and user pulls up, dampen significantly
    if (snap === 'full' && diff < 0) {
      setDragOffsetY(diff * 0.15);
      return;
    }

    setDragOffsetY(diff);
  };

  const handleTouchEnd = () => {
    if (dragStartY.current === null || dragCurrentY.current === null) {
      setIsDragging(false);
      setDragOffsetY(0);
      return;
    }

    const diff = dragCurrentY.current - dragStartY.current;
    const duration = Date.now() - touchStartTime.current;
    const isFlick = duration < 250 && Math.abs(diff) > 20;

    if (snap === 'half') {
      if (diff < -40 || (isFlick && diff < 0)) {
        // Swiped/Dragged up -> Expand to full
        setSnap('full');
      } else if (diff > 65 || (isFlick && diff > 0)) {
        // Swiped/Dragged down -> Dismiss
        handleCloseSmoothly();
      }
    } else if (snap === 'full') {
      if (diff > 50 || (isFlick && diff > 0)) {
        // Swiped/Dragged down -> Snap back to half
        setSnap('half');
      }
    }

    setIsDragging(false);
    setDragOffsetY(0);
    dragStartY.current = null;
    dragCurrentY.current = null;
  };

  // Scroll Container Touch: pull down when at top of list
  const handleScrollTouchStart = (e: React.TouchEvent) => {
    const el = scrollContainerRef.current;
    if (el && el.scrollTop <= 0) {
      dragStartY.current = e.touches[0].clientY;
      dragCurrentY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
    }
  };

  const handleScrollTouchMove = (e: React.TouchEvent) => {
    const el = scrollContainerRef.current;
    if (el && el.scrollTop <= 0 && dragStartY.current !== null) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - dragStartY.current;
      if (diff > 0) {
        // Dragging down at top of scroll
        setIsDragging(true);
        dragCurrentY.current = currentY;
        setDragOffsetY(diff);
      }
    }
  };

  if (!movieId) return null;

  const defaultWatchId =
    video?.kind === '2' && currentSeasonEpisodes.length > 0
      ? currentSeasonEpisodes[0].nb
      : video?.nb || movieId;

  // Calculate GPU Transform for Zero-Flicker Smooth 60fps Motion
  // Base offset in vh: full = 0vh, half = 34vh
  const baseOffsetVh = snap === 'full' ? 0 : 34;
  const currentDragPx = isDragging ? dragOffsetY : 0;
  
  let transformValue = `translateY(calc(${baseOffsetVh}vh + ${currentDragPx}px))`;
  if (isClosing) {
    transformValue = 'translateY(100%)';
  }

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-md select-none transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop Dismiss Area */}
      <div className="absolute inset-0 cursor-pointer" onClick={handleCloseSmoothly}></div>

      {/* GPU Accelerated 60fps Bottom Sheet */}
      <div
        style={{
          transform: transformValue,
          transition: isDragging
            ? 'none'
            : 'transform 0.34s cubic-bezier(0.18, 0.9, 0.28, 1)',
          willChange: 'transform',
          paddingBottom: `max(16px, ${safeArea.bottom}px)`,
        }}
        className="relative z-10 w-full sm:max-w-2xl h-[92vh] max-h-[92vh] bg-[#0c1220] border-t sm:border border-white/20 rounded-t-3xl sm:rounded-3xl shadow-[0_-12px_45px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white"
      >
        {/* Interactive Drag Pill Bar - Pure Swipe Gesture Zone */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full flex flex-col items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none bg-[#0d1527]"
        >
          <div className="w-14 h-1.5 rounded-full bg-white/40 active:bg-white/70 transition-colors shadow-sm"></div>
        </div>

        {/* Top Header Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#0d1527] flex-shrink-0 touch-none select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-alex-primary tracking-wider uppercase">
              {video?.kind === '2' ? 'مسلسل' : 'فيلم'}
            </span>
            <span className="text-xs sm:text-sm text-gray-400 font-bold">• تفاصيل العمل</span>
          </div>

          {/* Close Button Only (No Flickery Resize Button) */}
          <button
            type="button"
            onClick={handleCloseSmoothly}
            aria-label="إغلاق"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center flex-grow py-16 gap-4">
            <div className="w-12 h-12 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-300 text-xs sm:text-sm font-bold">جاري جلب تفاصيل وسيرفرات العمل...</p>
          </div>
        )}

        {/* Error State with Retry & Direct Watch Fallback */}
        {error && (
          <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center flex-grow gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <i className="fa-solid fa-triangle-exclamation text-2xl text-red-500"></i>
            </div>
            <p className="text-sm sm:text-base font-bold text-gray-200">{error}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setRetryCount((prev) => prev + 1)}
                className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs sm:text-sm font-black flex items-center gap-2 border border-white/20 cursor-pointer shadow-md"
              >
                <i className="fa-solid fa-rotate-right text-xs"></i>
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCloseSmoothly();
                  onWatch(movieId);
                }}
                className="px-5 py-2.5 rounded-xl bg-alex-primary hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.7)] cursor-pointer"
              >
                <i className="fa-solid fa-play text-xs"></i>
                <span>تشغيل العمل مباشرة</span>
              </button>
            </div>
          </div>
        )}

        {/* Loaded Data View */}
        {!loading && !error && video && (
          <div
            ref={scrollContainerRef}
            onTouchStart={handleScrollTouchStart}
            onTouchMove={handleScrollTouchMove}
            onTouchEnd={handleTouchEnd}
            className="overflow-y-auto overscroll-contain p-4 sm:p-6 flex flex-col gap-5 flex-grow"
          >
            {/* Top Media Banner / Poster Row */}
            <div className="flex gap-3.5 sm:gap-5 items-start">
              <div className="relative w-24 sm:w-32 aspect-[2/3] rounded-2xl sm:rounded-3xl overflow-hidden flex-shrink-0 border border-white/20 shadow-xl bg-[#070b13]">
                <Image
                  src={video.imgUrl || '/icon.svg'}
                  alt={video.ar_title || video.en_title || ''}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="flex flex-col gap-2 flex-grow min-w-0">
                <h2 className="text-base sm:text-xl font-black text-white leading-tight">
                  {video.ar_title || video.en_title}
                </h2>
                {video.en_title && video.ar_title && (
                  <p className="text-xs text-gray-400 font-medium truncate font-sans" dir="ltr">
                    {video.en_title}
                  </p>
                )}

                {/* Metadata Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {video.stars && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-400 font-black border border-yellow-500/30 text-xs">
                      <i className="fa-solid fa-star text-[10px]"></i>
                      {video.stars}
                    </span>
                  )}
                  {video.year && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-gray-200 font-bold text-xs">
                      {video.year}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-lg bg-alex-primary/20 text-alex-primary font-black text-xs border border-alex-primary/30">
                    {video.kind === '2' ? 'مسلسل كامل' : 'فيلم'}
                  </span>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseSmoothly();
                      onWatch(defaultWatchId);
                    }}
                    className="flex-grow py-2.5 px-4 rounded-xl bg-alex-primary hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.6)] transition-all cursor-pointer"
                  >
                    <i className="fa-solid fa-play text-xs"></i>
                    <span>مشاهدة الآن</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-label="المفضلة"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer active:scale-90 ${
                      isFavorite
                        ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                        : 'bg-white/10 border-white/15 text-gray-200 hover:text-white'
                    }`}
                  >
                    <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-heart text-sm`}></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Synopsis / Story */}
            {video.ar_content && (
              <div className="flex flex-col gap-1.5 bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-sm">
                <span className="text-xs sm:text-sm font-black text-gray-200 flex items-center gap-2">
                  <i className="fa-solid fa-align-right text-alex-primary text-xs"></i>
                  قصة العمل:
                </span>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line font-medium">
                  {video.ar_content}
                </p>
              </div>
            )}

            {/* Series Seasons and Episodes List */}
            {video.kind === '2' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <i className="fa-solid fa-tv text-alex-primary text-xs sm:text-sm"></i>
                    قائمة الحلقات
                  </span>
                  <span className="text-xs text-gray-400 font-bold">
                    {currentSeasonEpisodes.length} حلقة (الموسم {activeSeason})
                  </span>
                </div>

                {/* Season Tabs - Responsive Grid */}
                {seasonList.length > 1 && (
                  <div className="w-full bg-[#070b14] border border-white/10 rounded-2xl p-1.5 shadow-inner">
                    <div
                      className={`grid gap-1.5 w-full ${
                        seasonList.length <= 2
                          ? 'grid-cols-2'
                          : seasonList.length === 3
                          ? 'grid-cols-3'
                          : seasonList.length === 4
                          ? 'grid-cols-2 xs:grid-cols-4 sm:flex'
                          : 'grid-cols-3 xs:grid-cols-4 sm:flex sm:flex-wrap'
                      }`}
                    >
                      {seasonList.map((s, idx) => {
                        const isSelected = String(activeSeason).trim() === String(s.season).trim();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveSeason(s.season)}
                            className={`min-h-[38px] cursor-pointer rounded-xl px-3 py-1.5 text-xs font-black transition-all duration-300 flex items-center justify-center text-center active:scale-95 ${
                              isSelected
                                ? 'bg-alex-primary text-white shadow-[0_0_14px_rgba(229,9,20,0.5)] border border-white/20'
                                : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            <span>الموسم {s.season}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Episodes Grid/List */}
                {currentSeasonEpisodes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 sm:max-h-80 overflow-y-auto pl-1">
                    {currentSeasonEpisodes.map((ep, idx) => {
                      const epNumber = ep.episodeNummer || ep.episodeNumber || ep.episode_num || idx + 1;
                      return (
                        <div
                          key={ep.nb || idx}
                          onClick={() => {
                            handleCloseSmoothly();
                            onWatch(ep.nb);
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 active:scale-[0.98] transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-alex-primary/20 flex items-center justify-center text-alex-primary text-xs font-black flex-shrink-0 group-hover:bg-alex-primary group-hover:text-white transition-colors">
                              {epNumber}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs sm:text-sm font-black text-gray-100 truncate group-hover:text-white">
                                {ep.ar_title || `الحلقة ${epNumber}`}
                              </p>
                              {ep.duration && (
                                <span className="text-[10px] text-gray-400 font-semibold">
                                  {Math.round(Number(ep.duration) / 60)} دقيقة
                                </span>
                              )}
                            </div>
                          </div>
                          <i className="fa-solid fa-play text-[11px] text-gray-400 group-hover:text-white pr-2"></i>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400 bg-white/5 rounded-2xl border border-white/10">
                    لا توجد حلقات متاحة لهذا الموسم حالياً
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
