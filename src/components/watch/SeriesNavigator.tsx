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
    <div className="flex flex-col w-full animate-fade-in-up" dir="rtl">
      <div className="relative overflow-hidden w-full flex flex-col gap-3.5 sm:gap-4 p-3.5 sm:p-4.5 md:p-5 bg-[#090e1d]/90 rounded-3xl border border-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {/* Subtle Ambient Red Halo */}
        <div className="absolute -top-16 -right-16 size-36 rounded-full bg-red-600/10 blur-2xl pointer-events-none" />

        {/* ══════ Header Area: Title & Summary Badges ══════ */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 relative z-10 w-full">
          {/* Title + Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4.5 bg-red-600 rounded-full shadow-[0_0_12px_rgba(229,9,20,0.7)]" />
              <h3 className="text-sm sm:text-base font-black text-white whitespace-nowrap tracking-wide">
                حلقات المسلسل
              </h3>
            </div>
            
            {/* Meta Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2.5 py-0.5 rounded-lg text-[11px] font-black">
                {seasons.length} مواسم
              </span>
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-lg text-[11px] font-black">
                {episodes.length} حلقة
              </span>
            </div>
          </div>

          {/* Current Season Info Tag */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="text-slate-400">المعروض حالياً:</span>
            <span className="text-red-400 font-black">الموسم {currentSeason}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-mono text-[11px]">{seasonEpisodes.length} حلقة</span>
          </div>
        </div>

        {/* ══════ Dedicated Luxury Seasons Navigation Track (Dynamic Shrink-to-Fit) ══════ */}
        {seasons.length > 1 && (
          <div className="relative w-full z-10 flex">
            <div 
              className="inline-flex items-center gap-2 overflow-x-auto hide-scrollbar scroll-smooth max-w-full w-auto py-1.5 px-1.5 bg-black/40 rounded-2xl border border-white/8 backdrop-blur-md shadow-inner"
              style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
            >
              {seasons.map((s) => {
                const isSelected = currentSeason === s.season;
                const count = s.episodes?.length || episodes.filter(e => String(e.season) === String(s.season)).length;
                return (
                  <button
                    key={s.season}
                    type="button"
                    onClick={() => setCurrentSeason(s.season)}
                    className={`min-h-[34px] px-3.5 py-1 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_0_18px_rgba(229,9,20,0.5)] border border-red-500/50 scale-[1.02]'
                        : 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span>الموسم {s.season}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                        isSelected ? 'bg-black/40 text-white/90' : 'bg-white/10 text-slate-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════ MOBILE VIEW (sm:hidden): Direct Episodes Stream ══════ */}
        <div key={`mobile-${currentSeason}`} className="flex flex-col gap-2 sm:hidden w-full">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <i className="fa-solid fa-list-ol text-red-500 text-xs" />
              حلقات الموسم {currentSeason}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {seasonEpisodes.length} حلقة متاحة
            </span>
          </div>

          {/* Episode List with Left Padding to Prevent Scrollbar Collision in RTL */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pl-2 pr-0.5 py-1 custom-scrollbar">
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
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-2 text-right transition-all duration-200 active:scale-[0.98] ${
                    isActiveEp
                      ? 'bg-red-950/40 border-red-500/70 shadow-[0_0_20px_rgba(229,9,20,0.3)] ring-1 ring-red-500/30'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                  }`}
                >
                  {/* Right side: Thumbnail + Title + Meta */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Thumbnail with duration */}
                    <div className="relative w-22 aspect-[16/9] rounded-xl overflow-hidden shrink-0 border border-white/10 bg-[#070b13]">
                      <img
                        src={getImageUrl(videoImg, 'poster') || '/icon.svg'}
                        alt={`الحلقة ${ep.episodeNummer}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                        <span className="text-[8px] text-slate-200 font-mono font-bold px-1 py-0.2 rounded bg-black/70 backdrop-blur-sm">
                          {formatDuration(ep.duration || episodes[0]?.duration)}
                        </span>
                      </div>
                      {isActiveEp && (
                        <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                          <div className="size-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                            <i className="fa-solid fa-play text-[8px]" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Episode details */}
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <h4 className={`text-xs font-black truncate ${isActiveEp ? 'text-red-400' : 'text-white'}`}>
                        {ep.ar_title || `الحلقة ${ep.episodeNummer}`}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        الموسم {currentSeason} • الحلقة {ep.episodeNummer}
                      </p>
                    </div>
                  </div>

                  {/* Left side: Play status icon */}
                  <div className="shrink-0 pl-1">
                    {isActiveEp ? (
                      <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white text-[9px] font-black shadow-md flex items-center gap-1">
                        <i className="fa-solid fa-circle-play text-[9px]" />
                        شغّال
                      </span>
                    ) : (
                      <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                        <i className="fa-solid fa-play text-[10px]" />
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
            className={`absolute right-0 top-[40%] -translate-y-1/2 z-30 size-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer
              bg-[#0b101d]/95 backdrop-blur-xl border border-white/20 shadow-[0_6px_20px_rgba(0,0,0,0.7)] text-white hover:bg-red-600 hover:border-red-600 hover:scale-110 active:scale-95
              ${canScrollStart ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="تمرير لليسار"
            onClick={() => scrollBy('end')}
            className={`absolute left-0 top-[40%] -translate-y-1/2 z-30 size-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer
              bg-[#0b101d]/95 backdrop-blur-xl border border-white/20 shadow-[0_6px_20px_rgba(0,0,0,0.7)] text-white hover:bg-red-600 hover:border-red-600 hover:scale-110 active:scale-95
              ${canScrollEnd ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <i className="fa-solid fa-chevron-left text-[10px]" aria-hidden="true" />
          </button>

          <div 
            key={`desktop-${currentSeason}`}
            ref={scrollContainerRef}
            style={{ touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
            className="flex w-full overflow-x-auto hide-scrollbar scroll-smooth py-1 px-0.5 relative z-10 flex-row gap-3 sm:gap-3.5 select-none animate-fade-in-up" 
            dir="rtl"
          >
            {seasonEpisodes.map((ep) => {
              const isActiveEp = activeEpisode?.nb === ep.nb;
              return (
                <div 
                  key={ep.nb} 
                  data-active={isActiveEp ? 'true' : 'false'}
                  className="flex flex-col shrink-0 w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-0.875rem*2)/3)] md:w-[calc((100%-0.875rem*3)/4)] lg:w-[calc((100%-0.875rem*4)/5)] xl:w-[calc((100%-0.875rem*5)/6)] group"
                >
                  <button
                    type="button"
                    onClick={() => setActiveEpisode(ep)}
                    disabled={!canSelectEpisodes}
                    className={`relative aspect-[16/9] w-full rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer bg-[#070b13] isolate select-none ${
                      isActiveEp 
                        ? 'border-red-500 shadow-[0_6px_25px_rgba(229,9,20,0.45)] ring-1 ring-red-500/50 scale-[1.02]' 
                        : 'border-white/10 hover:border-red-500/50 hover:shadow-[0_6px_20px_rgba(0,0,0,0.6)] group-hover:scale-[1.02]'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <img 
                      src={getImageUrl(videoImg, 'poster') || '/icon.svg'} 
                      alt={`الحلقة ${ep.episodeNummer}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform" 
                      loading="lazy"
                    />

                    {/* Double-layer impenetrable obsidian mask eradicating any hover seam */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/40 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-3 bg-[#070b13] pointer-events-none z-10" />
                    
                    {/* Hover & Active Overlay */}
                    <div className={`absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300 ${
                      isActiveEp ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-xl border border-white/20">
                        <i className="fa-solid fa-circle-play text-[10px] text-white" />
                        <span>{isActiveEp ? 'جارٍ التشغيل' : 'تشغيل'}</span>
                      </div>
                    </div>

                    {isActiveEp && (
                      <div className="absolute top-2 right-2 z-20 bg-red-600 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black border border-white/20 backdrop-blur-md flex items-center gap-1 shadow-md">
                        <span className="size-1.5 rounded-full bg-white animate-ping" />
                        مباشر
                      </div>
                    )}
                  </button>
                  
                  {/* Metadata Row */}
                  <div className="flex justify-between items-center mt-1.5 px-0.5 text-[11px] font-bold">
                    <span className={`transition-colors truncate max-w-[70%] text-right ${isActiveEp ? 'text-red-400 font-black' : 'text-slate-200 group-hover:text-white'}`}>
                      {ep.ar_title || `الحلقة ${ep.episodeNummer}`}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
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
