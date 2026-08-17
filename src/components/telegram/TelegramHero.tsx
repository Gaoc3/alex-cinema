'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

export interface HeroBannerItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year?: string;
  stars?: string;
  kind?: string;
  ar_content?: string;
  imgUrl: string;
  coverUrl?: string;
}

interface TelegramHeroProps {
  initialBanners?: HeroBannerItem[];
  fallbackItems?: {
    nb: string;
    ar_title: string;
    en_title?: string;
    year?: string;
    stars?: string;
    kind?: string;
    imgUrl: string;
    coverUrl?: string;
    ar_content?: string;
  }[];
  onSelectMovie?: (id: string) => void;
  onWatchMovie?: (id: string) => void;
  onOpenDetails?: (id: string) => void;
}

export default function TelegramHero({
  initialBanners = [],
  fallbackItems = [],
  onSelectMovie,
  onWatchMovie,
  onOpenDetails,
}: TelegramHeroProps) {
  const [banners, setBanners] = useState<HeroBannerItem[]>(initialBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleWatch = (id: string) => {
    if (onWatchMovie) onWatchMovie(id);
    else if (onSelectMovie) onSelectMovie(id);
  };

  const handleDetails = (id: string) => {
    if (onOpenDetails) onOpenDetails(id);
    else if (onSelectMovie) onSelectMovie(id);
  };

  useEffect(() => {
    if (initialBanners && initialBanners.length > 0) {
      setBanners(initialBanners);
    }
  }, [initialBanners]);

  useEffect(() => {
    let isMounted = true;
    async function loadBanners() {
      try {
        const res = await fetch(`/api/bot?action=banners&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.results) && data.results.length > 0) {
            setBanners(data.results);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load bot banners:', err);
      }
      if (isMounted && fallbackItems.length > 0 && banners.length === 0) {
        setBanners(fallbackItems);
      }
    }
    loadBanners();
    return () => {
      isMounted = false;
    };
  }, [fallbackItems]);

  const items = banners.length > 0 ? banners : fallbackItems;

  // Preload all banner images into browser memory for 0ms instant swipe response
  useEffect(() => {
    if (!items || items.length === 0 || typeof window === 'undefined') return;
    items.forEach((item) => {
      const src = item.coverUrl || item.imgUrl;
      if (src) {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [items]);

  // Auto-advance hero slides every 7 seconds when not paused/hovered
  useEffect(() => {
    if (items.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [items.length, isHovered, currentIndex]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const duration = Date.now() - touchStartTime.current;
    const isFlick = duration < 300 && Math.abs(diff) > 20;

    if (Math.abs(diff) > 30 || isFlick) {
      if (diff > 0) {
        // Swiped left -> next slide (Instant 0ms response)
        handleNext();
      } else {
        // Swiped right -> prev slide (Instant 0ms response)
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  // Dynamic Rolling Pagination Dots (Max 5 visible dots, always perfectly proportioned)
  const maxDots = 5;
  const getVisibleDots = () => {
    if (items.length <= maxDots) {
      return items.map((_, i) => ({
        index: i,
        isCurrent: i === currentIndex,
        isEdge: false,
      }));
    }

    let start = currentIndex - Math.floor(maxDots / 2);
    start = Math.max(0, Math.min(start, items.length - maxDots));
    const end = start + maxDots;

    const dots = [];
    for (let i = start; i < end; i++) {
      const isCurrent = i === currentIndex;
      const isLeftEdge = i === start && start > 0;
      const isRightEdge = i === end - 1 && end < items.length;
      dots.push({
        index: i,
        isCurrent,
        isEdge: (isLeftEdge || isRightEdge) && !isCurrent,
      });
    }
    return dots;
  };

  if (items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];

  return (
    <div
      dir="rtl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.9)] border border-white/20 group bg-[#090e18] select-none"
    >
      {/* Ambient Pulsing Glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-alex-primary/30 via-purple-600/20 to-alex-primary/30 blur-3xl opacity-70 pointer-events-none"></div>

      {/* Main Banner Clickable Area */}
      <div
        onClick={() => handleDetails(currentItem.nb)}
        className="relative w-full h-[400px] xs:h-[440px] sm:h-[490px] md:h-[540px] lg:h-[600px] cursor-pointer overflow-hidden"
      >
        {/* Pre-rendered Stacked Images for 0ms Zero-Lag Instant Swiping */}
        {items.map((item, idx) => {
          const isCurrent = idx === currentIndex;
          const bgImage = item.coverUrl || item.imgUrl || '/icon.svg';
          return (
            <div
              key={item.nb || idx}
              className={`absolute inset-0 transition-opacity duration-200 ease-out ${
                isCurrent ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Image
                src={bgImage}
                alt={item.ar_title || item.en_title || 'Hero Banner'}
                fill
                priority={idx === 0 || isCurrent}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 1400px"
                className="object-cover object-center sm:object-[center_20%] filter brightness-[0.96] contrast-[1.05] saturate-[1.1]"
                unoptimized
              />
            </div>
          );
        })}

        {/* High-definition Cinematographic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/70 to-transparent z-[2]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b13]/90 via-[#070b13]/40 to-transparent z-[2]"></div>

        {/* Content Details Overlay */}
        <div className="absolute bottom-0 right-0 left-0 p-4 xs:p-5 sm:p-8 md:p-12 pb-11 sm:pb-12 flex flex-col justify-end items-start text-right z-10">
          {/* Badges & Meta Tags */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-alex-primary text-white text-[11px] sm:text-xs font-black shadow-md">
              {currentItem.kind === '2' ? 'مسلسل مميز' : 'فيلم مميز'}
            </span>
            {currentItem.stars && currentItem.stars !== '0' && (
              <span className="px-2.5 py-1 rounded-xl bg-black/75 text-yellow-400 text-[11px] sm:text-xs font-black border border-yellow-500/40 backdrop-blur-md flex items-center gap-1 shadow-sm">
                <i className="fa-solid fa-star text-[10px] sm:text-xs"></i>
                <span>{currentItem.stars}</span>
              </span>
            )}
            {currentItem.year && (
              <span className="px-2.5 py-1 rounded-xl bg-white/15 text-gray-200 text-[11px] sm:text-xs font-bold backdrop-blur-md border border-white/10">
                {currentItem.year}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] max-w-3xl line-clamp-2 sm:line-clamp-1 mb-1">
            {currentItem.ar_title || currentItem.en_title}
          </h2>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2.5 sm:gap-4 mt-3.5 sm:mt-6 w-full xs:w-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleWatch(currentItem.nb);
              }}
              className="flex-1 xs:flex-initial px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-alex-primary hover:bg-red-700 active:scale-95 text-white text-xs sm:text-base font-black flex items-center justify-center gap-2.5 transition-all shadow-[0_0_24px_rgba(229,9,20,0.7)] cursor-pointer"
            >
              <i className="fa-solid fa-play text-xs sm:text-sm"></i>
              <span>مشاهدة الآن</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDetails(currentItem.nb);
              }}
              className="flex-1 xs:flex-initial px-4 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs sm:text-base font-black backdrop-blur-xl border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-circle-info text-xs sm:text-sm"></i>
              <span>التفاصيل</span>
            </button>
          </div>
        </div>

        {/* Interactive Desktop Nav Chevrons (Left = Prev, Right = Next) */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              title="السابق"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/25 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-20 cursor-pointer shadow-2xl active:scale-90"
            >
              <i className="fa-solid fa-chevron-left text-sm sm:text-base"></i>
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="التالي"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/25 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-20 cursor-pointer shadow-2xl active:scale-90"
            >
              <i className="fa-solid fa-chevron-right text-sm sm:text-base"></i>
            </button>
          </>
        )}

        {/* Sleek 5-Dot Dynamic Indicator: Fixed size, zero overflow, red indicator always glowing in view */}
        {items.length > 1 && (
          <div
            dir="ltr"
            className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 z-20 shadow-2xl pointer-events-auto select-none"
          >
            {getVisibleDots().map(({ index, isCurrent, isEdge }) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                aria-label={`الانتقال للشريحة ${index + 1}`}
                className={`relative rounded-full transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? 'w-6 sm:w-7 h-2 bg-alex-primary shadow-[0_0_12px_rgba(229,9,20,0.95)]'
                    : isEdge
                    ? 'w-1.5 h-1.5 bg-white/30 scale-75'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
