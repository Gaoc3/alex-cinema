import React, { useEffect, useRef, useState } from 'react';
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
  videoImg
}: SeriesNavigatorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // AI Engine State simulation for visual wow-factor
  const [aiStatus, setAiStatus] = useState<'CALIBRATING' | 'HARMONIZED'>('CALIBRATING');
  const [scrollProgress, setScrollProgress] = useState(0);

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

  // AI Layout Engine - Smart Scroll Alignment & Center Logic
  const triggerSmartAlign = () => {
    setAiStatus('CALIBRATING');
    setTimeout(() => {
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
      setAiStatus('HARMONIZED');
    }, 300);
  };

  // Auto-align when active episode changes
  useEffect(() => {
    triggerSmartAlign();
  }, [activeEpisode?.nb]);

  // Track scroll position for AI dashboard metrics
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      // In RTL, scrollLeft can be negative or positive depending on browser implementation.
      // We normalize it to a percentage 0-100.
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((Math.abs(scrollLeft) / maxScroll) * 100)));
        setScrollProgress(progress);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in-up" dir="rtl">
      {/* Visual Episodes Horizontal Scroll Panel */}
      <div className="w-full flex flex-col">
        <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/5 w-full flex flex-col gap-5">
          
          {/* Header Area (RTL Layout) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-4 relative z-10 w-full">
            
            {/* Title Area (Right in RTL) */}
            <div className="flex items-center gap-3.5">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <div className="w-1.5 h-5.5 bg-[#E50914] rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
                <span>حلقات المسلسل</span>
              </h3>
              
              {/* Visual Glass Badges */}
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black">
                  {seasons.length} مواسم
                </span>
                <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black">
                  {episodes.length} حلقة
                </span>
              </div>
            </div>

            {/* Seasons Selector Area (Left in RTL) */}
            {seasons.length > 0 && (
              <div className="flex bg-white/[0.04] border border-white/5 rounded-full p-1 w-max select-none">
                {seasons.map((s) => {
                  const isSelected = currentSeason === s.season;
                  return (
                    <button
                      key={s.season}
                      onClick={() => setCurrentSeason(s.season)}
                      className={`px-4.5 py-1.5 rounded-full text-xs font-black transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'bg-white text-black shadow-md'
                          : 'text-gray-400 hover:text-white bg-transparent'
                      }`}
                    >
                      الموسم {s.season}
                    </button>
                  );
                })}
              </div>
            )}

          </div>

          {/* Widescreen Episodes Horizontal Scroll List (With Negative Margin and Fade-In Animation Key) */}
          <div 
            key={currentSeason}
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="w-[calc(100%+3rem)] -mx-6 md:w-[calc(100%+4rem)] md:-mx-8 overflow-x-auto pb-4 pt-3.5 px-6 md:px-8 relative z-10 custom-scrollbar flex flex-row gap-5.5 select-none animate-fade-in-up" 
            dir="rtl"
          >
            {seasonEpisodes.map((ep) => {
              const isActiveEp = activeEpisode?.nb === ep.nb;
              return (
                <div 
                  key={ep.nb} 
                  data-active={isActiveEp ? "true" : "false"}
                  className="flex flex-col shrink-0 w-48 sm:w-56 group"
                >
                  <button
                    onClick={() => setActiveEpisode(ep)}
                    className={`relative aspect-[16/10] w-full rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer ${
                      isActiveEp 
                        ? 'border-alex-primary shadow-[0_0_15px_rgba(229,9,20,0.4)] scale-[1.02]' 
                        : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <img 
                      src={getImageUrl(videoImg, 'poster') || '/logo.svg'} 
                      alt={`الحلقة ${ep.episodeNummer}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      loading="lazy"
                    />
                    
                    {/* Zero-Legacy Premium Hover Overlay */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300 ${
                      isActiveEp 
                        ? 'opacity-100' 
                        : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="px-3 py-1.5 rounded-full bg-alex-primary/95 border border-alex-primary/10 backdrop-blur-md text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-lg shadow-alex-primary/20">
                        <i className="fa-solid fa-circle-play text-[11px] text-white"></i>
                        <span>{isActiveEp ? 'شاهد الآن' : 'شاهد'}</span>
                      </div>
                    </div>
                  </button>
                  
                  {/* Metadata Row */}
                  <div className="flex justify-between items-center mt-2 px-1 text-xs text-gray-400 font-bold">
                    <span className={`transition-colors truncate max-w-[70%] text-right ${isActiveEp ? 'text-[#E50914] font-black' : 'text-gray-200 group-hover:text-white'}`}>
                      الحلقة {ep.episodeNummer}
                    </span>
                    <span className="font-en opacity-60">
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
