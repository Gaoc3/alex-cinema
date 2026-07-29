import React, { useEffect, useRef } from 'react';
import { getImageUrl } from '@/utils/imageHelper';

interface SeriesNavigatorProps {
  seasons: any[];
  episodes: any[];
  currentSeason: string;
  setCurrentSeason: (season: string) => void;
  activeEpisode: any;
  setActiveEpisode: (ep: any) => void;
  seasonEpisodes: any[];
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
  
  // Format seconds to hh:mm:ss or mm:ss
  const formatDuration = (secondsStr: string | undefined | null) => {
    if (!secondsStr) return "45:00";
    const seconds = parseInt(secondsStr);
    if (isNaN(seconds) || seconds <= 0) return "45:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-align active episode card into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeCard = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeEpisode?.nb]);

  return (
    <div className="flex flex-col gap-5 w-full animate-fade-in-up" dir="rtl">
      <div className="bg-[#0b101d]/90 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden w-full flex flex-col gap-5">
        
        {/* Header Area & Season Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10 w-full">
          
          {/* Title Area */}
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
              <div className="w-2 h-6 bg-gradient-to-b from-[#E50914] to-rose-600 rounded-full shadow-[0_0_12px_rgba(229,9,20,0.6)] animate-pulse"></div>
              <span>حلقات المسلسل</span>
            </h3>
            
            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2.5 py-0.5 rounded-xl text-[10px] font-extrabold">
                {seasons.length} مواسم
              </span>
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-xl text-[10px] font-extrabold">
                {episodes.length} حلقة
              </span>
            </div>
          </div>

          {/* Seasons Selector */}
          {seasons.length > 0 && (
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto custom-scrollbar max-w-full">
              {seasons.map((s) => {
                const isSelected = currentSeason === s.season;
                return (
                  <button
                    key={s.season}
                    onClick={() => setCurrentSeason(s.season)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-[0_2px_12px_rgba(229,9,20,0.4)] border border-white/20 scale-[1.02]'
                        : 'text-gray-400 hover:text-white bg-transparent hover:bg-white/5'
                    }`}
                  >
                    الموسم {s.season}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MOBILE VIEW (SM:HIDDEN): Vertical Episodes List Layout         */}
        {/* ------------------------------------------------------------- */}
        <div key={`mobile-${currentSeason}`} className="flex flex-col gap-3 sm:hidden w-full">
          {seasonEpisodes.map((ep) => {
            const isActiveEp = activeEpisode?.nb === ep.nb;
            return (
              <div
                key={ep.nb}
                data-active={isActiveEp ? "true" : "false"}
                onClick={() => canSelectEpisodes && setActiveEpisode(ep)}
                onKeyDown={(event) => {
                  if (canSelectEpisodes && (event.key === 'Enter' || event.key === ' ')) setActiveEpisode(ep);
                }}
                role="button"
                tabIndex={canSelectEpisodes ? 0 : -1}
                aria-disabled={!canSelectEpisodes}
                className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-300 ${canSelectEpisodes ? 'cursor-pointer' : 'cursor-default opacity-85'} ${
                  isActiveEp
                    ? 'bg-red-950/30 border-red-500/60 shadow-[0_4px_20px_rgba(229,9,20,0.25)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20 active:scale-[0.98]'
                }`}
              >
                {/* Episode Thumbnail */}
                <div className="relative w-28 aspect-[16/10] rounded-xl overflow-hidden shrink-0 border border-white/10">
                  <img
                    src={getImageUrl(videoImg, 'poster') || '/logo.svg'}
                    alt={`الحلقة ${ep.episodeNummer}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${isActiveEp ? 'opacity-100' : 'opacity-80'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActiveEp ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(229,9,20,0.8)]' : 'bg-white/20 text-white'}`}>
                      <i className="fa-solid fa-play text-xs mr-0.5"></i>
                    </div>
                  </div>
                  {isActiveEp && (
                    <span className="absolute top-1 right-1 bg-red-600 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black animate-pulse">
                      المشاهدة 🔴
                    </span>
                  )}
                </div>

                {/* Episode Info */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-black truncate ${isActiveEp ? 'text-red-400' : 'text-white'}`}>
                      الحلقة {ep.episodeNummer}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-en font-bold">
                      {formatDuration(ep.duration || episodes[0]?.duration)}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-1 font-medium mb-2">
                    الموسم {currentSeason} • {videoTitle}
                  </p>

                  <div className="flex items-center gap-2">
                    <button disabled={!canSelectEpisodes} className={`px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all ${
                      isActiveEp 
                        ? 'bg-red-600 text-white shadow-md' 
                        : 'bg-white/10 text-gray-300 hover:text-white'
                    }`}>
                      <i className="fa-solid fa-circle-play text-[9px]"></i>
                      <span>{isActiveEp ? 'شغّال الآن' : 'تشغيل الحلقة'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* DESKTOP & TABLET VIEW (HIDDEN SM:FLEX): Horizontal Carousel   */}
        {/* ------------------------------------------------------------- */}
        <div 
          key={`desktop-${currentSeason}`}
          ref={scrollContainerRef}
          className="hidden sm:flex w-[calc(100%+3rem)] -mx-6 md:w-[calc(100%+4rem)] md:-mx-8 overflow-x-auto pb-4 pt-2 px-6 md:px-8 relative z-10 custom-scrollbar flex-row gap-5 select-none animate-fade-in-up" 
          dir="rtl"
        >
          {seasonEpisodes.map((ep) => {
            const isActiveEp = activeEpisode?.nb === ep.nb;
            return (
              <div 
                key={ep.nb} 
                data-active={isActiveEp ? "true" : "false"}
                className="flex flex-col shrink-0 w-52 md:w-60 group"
              >
                <button
                  onClick={() => setActiveEpisode(ep)}
                  disabled={!canSelectEpisodes}
                  className={`relative aspect-[16/10] w-full rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                    isActiveEp 
                      ? 'border-red-500 shadow-[0_8px_30px_rgba(229,9,20,0.4)] scale-[1.03]' 
                      : 'border-white/10 hover:border-red-500/50 hover:shadow-[0_6px_20px_rgba(0,0,0,0.6)] group-hover:scale-[1.02]'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <img 
                    src={getImageUrl(videoImg, 'poster') || '/logo.svg'} 
                    alt={`الحلقة ${ep.episodeNummer}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    loading="lazy"
                  />
                  
                  {/* Gradient & Hover Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-center transition-all duration-300 ${
                    isActiveEp ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-700 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-xl border border-white/20">
                      <i className="fa-solid fa-circle-play text-xs text-white"></i>
                      <span>{isActiveEp ? 'جارٍ التشغيل 🔴' : 'تشغيل الحلقة'}</span>
                    </div>
                  </div>

                  {isActiveEp && (
                    <div className="absolute top-2.5 right-2.5 bg-red-600/90 text-white px-2 py-0.5 rounded-lg text-[9px] font-black border border-white/20 backdrop-blur-md flex items-center gap-1 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      مباشر
                    </div>
                  )}
                </button>
                
                {/* Metadata Row */}
                <div className="flex justify-between items-center mt-2.5 px-1 text-xs font-bold">
                  <span className={`transition-colors truncate max-w-[70%] text-right ${isActiveEp ? 'text-red-400 font-black' : 'text-gray-200 group-hover:text-white'}`}>
                    الحلقة {ep.episodeNummer}
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
  );
}
