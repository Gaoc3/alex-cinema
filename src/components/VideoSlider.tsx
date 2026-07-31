'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getVideoImageUrl } from '@/utils/imageHelper';

interface Video {
  nb: string;
  ar_title: string;
  en_title?: string;
  img: string;
  stars: string;
  year: string;
  kind?: string;
  categories?: { ar_title: string }[];
}

interface VideoSliderProps {
  title: string;
  subtitle?: string;
  videos: Video[];
  accentColor?: string; // 'red' | 'blue'
}

export default function VideoSlider({ title, subtitle, videos, accentColor = 'red' }: VideoSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = Math.abs(el.scrollLeft);
    setCanScrollStart(scrollLeft > 10);
    setCanScrollEnd(scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.75;
      // In RTL context: 'left' moves towards previous/beginning, 'right' moves towards next/end
      const amount = direction === 'left' ? -scrollAmount : scrollAmount;
      el.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [videos, updateScrollButtons]);

  if (!videos || videos.length === 0) return null;

  const isRed = accentColor === 'red';

  return (
    <div className="relative w-full px-2 sm:px-4 mb-16 group/slider">
      {/* Slider Title Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-1.5 h-9 rounded-full shadow-lg ${
            isRed 
              ? 'bg-alex-primary shadow-[0_0_14px_rgba(229,9,20,0.7)]' 
              : 'bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.7)]'
          }`}></div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-gray-400 mt-1 text-sm font-medium">{subtitle}</p>}
          </div>
        </div>

        {/* Header Quick Navigation Pills */}
        <div className="hidden sm:flex items-center gap-1.5 bg-black/40 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl shadow-lg">
          <button 
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollStart}
            aria-label="السابق"
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all duration-300 ${
              canScrollStart
                ? isRed 
                  ? 'bg-white/10 text-white hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(229,9,20,0.5)] cursor-pointer'
                  : 'bg-white/10 text-white hover:bg-blue-600 hover:text-white hover:shadow-[0_0_12px_rgba(59,130,246,0.5)] cursor-pointer'
                : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-40'
            }`}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>

          <span className="w-px h-4 bg-white/10"></span>

          <button 
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollEnd}
            aria-label="التالي"
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all duration-300 ${
              canScrollEnd
                ? isRed 
                  ? 'bg-white/10 text-white hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(229,9,20,0.5)] cursor-pointer'
                  : 'bg-white/10 text-white hover:bg-blue-600 hover:text-white hover:shadow-[0_0_12px_rgba(59,130,246,0.5)] cursor-pointer'
                : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-40'
            }`}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
        </div>
      </div>

      {/* Slider Container Wrapper */}
      <div className="relative">
        {/* Modern Vertical Capsule Navigation Handles – Right (RTL Next) */}
        <button 
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll Right"
          className={`hidden sm:flex group/btn absolute -right-3 sm:-right-6 top-[125px] -translate-y-1/2 z-30 w-10 sm:w-11 h-24 sm:h-28 rounded-2xl items-center justify-center text-white
            bg-[#090d18]/85 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.7)]
            ${isRed 
              ? 'hover:bg-gradient-to-b hover:from-red-600 hover:to-rose-700 hover:border-red-400/80 hover:shadow-[0_0_25px_rgba(229,9,20,0.6)]' 
              : 'hover:bg-gradient-to-b hover:from-blue-600 hover:to-indigo-700 hover:border-blue-400/80 hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]'
            } hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer
            ${canScrollEnd ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <i className="fa-solid fa-angle-right text-lg transition-transform duration-300 group-hover/btn:translate-x-0.5"></i>
        </button>

        {/* Modern Vertical Capsule Navigation Handles – Left (RTL Prev) */}
        <button 
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll Left"
          className={`hidden sm:flex group/btn absolute -left-3 sm:-left-6 top-[125px] -translate-y-1/2 z-30 w-10 sm:w-11 h-24 sm:h-28 rounded-2xl items-center justify-center text-white
            bg-[#090d18]/85 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.7)]
            ${isRed 
              ? 'hover:bg-gradient-to-b hover:from-red-600 hover:to-rose-700 hover:border-red-400/80 hover:shadow-[0_0_25px_rgba(229,9,20,0.6)]' 
              : 'hover:bg-gradient-to-b hover:from-blue-600 hover:to-indigo-700 hover:border-blue-400/80 hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]'
            } hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer
            ${canScrollStart ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <i className="fa-solid fa-angle-left text-lg transition-transform duration-300 group-hover/btn:-translate-x-0.5"></i>
        </button>

        {/* Left & Right edge blur/fade overlays */}
        <div className={`pointer-events-none absolute right-0 top-0 h-full w-14 z-20 bg-gradient-to-l from-[#060811] via-[#060811]/60 to-transparent transition-opacity duration-300 ${canScrollStart ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`pointer-events-none absolute left-0 top-0 h-full w-14 z-20 bg-gradient-to-r from-[#060811] via-[#060811]/60 to-transparent transition-opacity duration-300 ${canScrollEnd ? 'opacity-100' : 'opacity-0'}`} />

        {/* Horizontal Card Rail */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth py-2 px-1 snap-x snap-mandatory"
        >
          {videos.map((video, index) => {
            const displayCategory = video.categories && video.categories.length > 0 
              ? video.categories[0].ar_title 
              : (video.kind === '2' ? 'مسلسل' : 'فيلم');

            return (
              <Link 
                key={video.nb} 
                href={`/watch/${video.nb}?title=${encodeURIComponent(video.ar_title || video.en_title || '')}`}
                className="w-[170px] sm:w-[190px] flex-shrink-0 group/card block relative snap-start transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-105"
                style={{ animationDelay: `${index * 25}ms` }}
              >
                {/* Poster Wrapper */}
                <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                  <Image 
                    src={getVideoImageUrl(video, 'poster')}
                    alt={video.ar_title} 
                    fill
                    unoptimized
                    className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
                    loading="lazy"
                  />
                  <div className="movie-card-overlay"></div>

                  {/* Play Hover Indicator */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center ios-button text-white">
                      <i className="fa-solid fa-play ml-1 text-xl"></i>
                    </div>
                  </div>
                </div>

                {/* Info Details directly below the poster (Transparent Background style) */}
                <div className="mt-3 px-1 space-y-1.5">
                  {/* Rating & Title Row */}
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Title */}
                    <h3 className="text-sm font-bold text-gray-100 group-hover/card:text-white transition-colors truncate flex-grow text-right leading-tight" title={video.ar_title}>
                      {video.ar_title}
                    </h3>

                    {/* IMDB Rating Badge */}
                    <div className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-black text-yellow-400">
                      <span className="font-en mt-0.5">{video.stars}</span>
                      <span className="text-[8px] opacity-70">IMDb</span>
                    </div>
                  </div>

                  {/* Category & Year Row */}
                  <div className="flex items-center text-[11px] font-semibold text-gray-400 justify-end gap-1.5 leading-none">
                    <span>{video.year}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    <span>{displayCategory}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
