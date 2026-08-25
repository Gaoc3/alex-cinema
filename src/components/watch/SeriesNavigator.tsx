'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getImageUrl } from '@/utils/imageHelper';

export interface SeriesSeason {
  season: string;
}

export interface SeriesEpisode {
  nb: string;
  episodeNummer: string;
  season: string;
  duration?: string;
  ar_title?: string;
  en_title?: string;
  publishDate?: string;
  stars?: string;
  ar_content?: string;
}

interface SeriesNavigatorProps {
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
  currentSeason: string;
  setCurrentSeason: (season: string) => void;
  activeEpisode: SeriesEpisode | null;
  setActiveEpisode: (episode: SeriesEpisode) => void;
  seasonEpisodes: SeriesEpisode[];
  videoTitle: string;
  videoImg: string;
  canSelectEpisodes?: boolean;
}

export default function SeriesNavigator({
  seasons,
  episodes,
  currentSeason,
  setCurrentSeason,
  activeEpisode,
  setActiveEpisode,
  seasonEpisodes,
  videoTitle,
  videoImg,
  canSelectEpisodes = true,
}: SeriesNavigatorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  // Format seconds to mm:ss or hh:mm:ss
  const formatDuration = (secondsStr: string | undefined | null) => {
    if (!secondsStr) return '45:00';
    const seconds = parseInt(secondsStr);
    if (isNaN(seconds) || seconds <= 0) return '45:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Update scroll arrow visibility for desktop carousel
  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollLeft = Math.abs(el.scrollLeft);
    setCanScrollStart(scrollLeft > 8);
    setCanScrollEnd(scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scrollBy = useCallback((direction: 'start' | 'end') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'end' ? -el.clientWidth : el.clientWidth;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeCard = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
    setTimeout(updateScrollButtons, 300);
  }, [activeEpisode?.nb, updateScrollButtons]);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollButtons);
  }, [currentSeason, seasonEpisodes, updateScrollButtons]);

  return (
    <div className="flex flex-col gap-4 w-full animate-fade-in-up" dir="rtl">
      <div className="bg-[#0c1322] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl border border-white/10 relative overflow-hidden w-full flex flex-col gap-4 sm:gap-6">
        
        {/* ══════ Header Area: Title, Badges & Fully Dynamic Season Selector ══════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-white/10 pb-4 relative z-10 w-full">
          {/* Title Area + Badges */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 sm:w-2 h-5 sm:h-6 bg-alex-primary rounded-full shadow-[0_0_12px_rgba(229,9,20,0.6)]"></div>
              <h3 className="text-base sm:text-lg font-black text-white whitespace-nowrap">حلقات المسلسل</h3>
            </div>
            
            {/* Meta Count Badges */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2.5 py-0.5 rounded-xl text-[11px] font-black">
                {seasons.length} مواسم
              </span>
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-xl text-[11px] font-black">
                {episodes.length} حلقة
              </span>
            </div>
          </div>

          {/* Season Selector - Fully Dynamic Adaptive Horizontal Track (No rigid dead-space box) */}
          {seasons.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto py-1 max-w-full">
              {seasons.map((s) => {
                const isSelected = currentSeason === s.season;
                return (
                  <button
                    key={s.season}
                    type="button"
                    onClick={() => setCurrentSeason(s.season)}
                    className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center cursor-pointer select-none active:scale-95 shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-alex-primary to-red-700 text-white shadow-[0_0_18px_rgba(229,9,20,0.5)] border border-red-500/40'
                        : 'text-gray-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10'
                    }`}
                  >
                    <span>الموسم {s.season}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════ MOBILE VIEW (sm:hidden): Direct Episodes Stream ══════ */}
        <div key={`mobile-${currentSeason}`} className="flex flex-col gap-3 sm:hidden w-full">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-gray-300 flex items-center gap-2">
              <i className="fa-solid fa-list-ol text-alex-primary text-xs"></i>
              حلقات الموسم {currentSeason}
            </span>
            <span className="text-[11px] font-bold text-gray-400">
              {seasonEpisodes.length} حلقة متاحة
            </span>
          </div>

          {/* Episode List with Left Padding to Prevent Scrollbar Collision in RTL */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pl-3.5 pr-1 py-1 custom-scrollbar">
            {seasonEpisodes.map((ep) => {
              const isActiveEp = activeEpisode?.nb === ep.nb;
              return (
                <button
                  key={ep.nb}
                  type="button"
                  data-active={isActiveEp ? 'true' : 'false'}
                  onClick={() => setActiveEpisode(ep)}
                  disabled={!canSelectEpisodes}
                  aria-pressed={isActiveEp}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-2.5 text-right transition-all duration-300 active:scale-[0.98] ${
                    isActiveEp
                      ? 'bg-red-950/40 border-alex-primary shadow-[0_0_20px_rgba(229,9,20,0.3)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                  }`}
                >
                  {/* Right side: Thumbnail + Title + Meta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail with duration */}
                    <div className="relative w-24 xs:w-28 aspect-[16/10] rounded-xl overflow-hidden shrink-0 border border-white/10 bg-[#070b13]">
                      <img
                        src={getImageUrl(videoImg, 'poster') || '/icon.svg'}
                        alt={`الحلقة ${ep.episodeNummer}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                        <span className="text-[9px] text-gray-200 font-en font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                          {formatDuration(ep.duration || episodes[0]?.duration)}
                        </span>
                      </div>
                      {isActiveEp && (
                        <div className="absolute inset-0 bg-alex-primary/20 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-alex-primary text-white flex items-center justify-center shadow-lg">
                            <i className="fa-solid fa-play text-[10px]"></i>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Episode details */}
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <h4 className={`text-xs xs:text-sm font-black truncate ${isActiveEp ? 'text-alex-primary' : 'text-white'}`}>
                        {ep.ar_title || `الحلقة ${ep.episodeNummer}`}
                      </h4>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        الموسم {currentSeason} • الحلقة {ep.episodeNummer}
                      </p>
                    </div>
                  </div>

                  {/* Left side: Play status icon */}
                  <div className="shrink-0 pl-1">
                    {isActiveEp ? (
                      <span className="px-2.5 py-1 rounded-xl bg-alex-primary text-white text-[10px] font-black shadow-md flex items-center gap-1">
                        <i className="fa-solid fa-circle-play text-[10px]"></i>
                        شغّال
                      </span>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
                        <i className="fa-solid fa-play text-[11px]"></i>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════ DESKTOP & TABLET VIEW (hidden sm:block): Horizontal Carousel ══════ */}
        <div className="hidden sm:block relative w-full">
          {/* Scroll Chevrons */}
          <button
            type="button"
            aria-label="تمرير لليمين"
            onClick={() => scrollBy('start')}
            className={`absolute right-1 top-[40%] -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer
              bg-[#0b101d]/95 backdrop-blur-xl border border-white/20 shadow-[0_6px_20px_rgba(0,0,0,0.7)] text-white hover:bg-alex-primary hover:border-alex-primary hover:scale-110 active:scale-95
              ${canScrollStart ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="تمرير لليسار"
            onClick={() => scrollBy('end')}
            className={`absolute left-1 top-[40%] -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer
              bg-[#0b101d]/95 backdrop-blur-xl border border-white/20 shadow-[0_6px_20px_rgba(0,0,0,0.7)] text-white hover:bg-alex-primary hover:border-alex-primary hover:scale-110 active:scale-95
              ${canScrollEnd ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
          </button>

          <div 
            key={`desktop-${currentSeason}`}
            ref={scrollContainerRef}
            style={{ touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
            className="flex w-full overflow-x-auto hide-scrollbar scroll-smooth py-2 px-1 relative z-10 flex-row gap-4 sm:gap-5 select-none animate-fade-in-up" 
            dir="rtl"
          >
            {seasonEpisodes.map((ep) => {
              const isActiveEp = activeEpisode?.nb === ep.nb;
              return (
                <div 
                  key={ep.nb} 
                  data-active={isActiveEp ? 'true' : 'false'}
                  className="flex flex-col shrink-0 w-[calc((100%-1rem)/2)] sm:w-[calc((100%-1.25rem*2)/3)] md:w-[calc((100%-1.25rem*3)/4)] lg:w-[calc((100%-1.25rem*4)/5)] xl:w-[calc((100%-1.25rem*5)/6)] group"
                >
                  <button
                    type="button"
                    onClick={() => setActiveEpisode(ep)}
                    disabled={!canSelectEpisodes}
                    className={`relative aspect-[16/10] w-full rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                      isActiveEp 
                        ? 'border-alex-primary shadow-[0_8px_30px_rgba(229,9,20,0.4)] scale-[1.03]' 
                        : 'border-white/10 hover:border-alex-primary/50 hover:shadow-[0_6px_20px_rgba(0,0,0,0.6)] group-hover:scale-[1.02]'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <img 
                      src={getImageUrl(videoImg, 'poster') || '/icon.svg'} 
                      alt={`الحلقة ${ep.episodeNummer}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      loading="lazy"
                    />
                    
                    {/* Hover & Active Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-center transition-all duration-300 ${
                      isActiveEp ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="px-3.5 py-1.5 rounded-full bg-alex-primary text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-xl border border-white/20">
                        <i className="fa-solid fa-circle-play text-xs text-white"></i>
                        <span>{isActiveEp ? 'جارٍ التشغيل 🔴' : 'تشغيل الحلقة'}</span>
                      </div>
                    </div>

                    {isActiveEp && (
                      <div className="absolute top-2.5 right-2.5 bg-alex-primary text-white px-2 py-0.5 rounded-lg text-[9px] font-black border border-white/20 backdrop-blur-md flex items-center gap-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        مباشر
                      </div>
                    )}
                  </button>
                  
                  {/* Metadata Row */}
                  <div className="flex justify-between items-center mt-2 px-1 text-xs font-bold">
                    <span className={`transition-colors truncate max-w-[70%] text-right ${isActiveEp ? 'text-alex-primary font-black' : 'text-gray-200 group-hover:text-white'}`}>
                      {ep.ar_title || `الحلقة ${ep.episodeNummer}`}
                    </span>
                    <span className="text-gray-400 font-en opacity-80 text-[11px]">
                      {formatDuration(ep.duration || episodes[0]?.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
