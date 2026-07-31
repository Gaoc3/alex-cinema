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

  return (
    <div className="relative w-full px-2 sm:px-4 mb-16 group/slider">
      {/* Slider Title Header */}
      <div className="flex items-end justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-1.5 h-9 rounded-full shadow-lg ${
            accentColor === 'red' 
              ? 'bg-alex-primary shadow-[0_0_12px_rgba(229,9,20,0.6)]' 
              : 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
          }`}></div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-gray-400 mt-1 text-sm font-medium">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Slider Container Wrapper */}
      <div className="relative">
        {/* Navigation Arrow – Right / Next (RTL: right side) */}
        <button 
          onClick={() => scroll('right')}
          className={`hidden sm:flex absolute -right-3 sm:-right-5 top-[38%] -translate-y-1/2 z-30 w-11 h-11 lg:w-12 lg:h-12 rounded-full items-center justify-center text-white
            bg-[#0b101d]/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.6)]
            hover:bg-red-600 hover:border-red-500/80 hover:shadow-[0_8px_30px_rgba(229,9,20,0.5)] hover:scale-110 active:scale-95 transition-all duration-300
            ${canScrollEnd ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-label="Scroll Right"
        >
          <i className="fa-solid fa-chevron-right text-base"></i>
        </button>

        {/* Navigation Arrow – Left / Prev (RTL: left side) */}
        <button 
          onClick={() => scroll('left')}
          className={`hidden sm:flex absolute -left-3 sm:-left-5 top-[38%] -translate-y-1/2 z-30 w-11 h-11 lg:w-12 lg:h-12 rounded-full items-center justify-center text-white
            bg-[#0b101d]/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.6)]
            hover:bg-red-600 hover:border-red-500/80 hover:shadow-[0_8px_30px_rgba(229,9,20,0.5)] hover:scale-110 active:scale-95 transition-all duration-300
            ${canScrollStart ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-label="Scroll Left"
        >
          <i className="fa-solid fa-chevron-left text-base"></i>
        </button>

        {/* Left & Right edge blur/fade overlays */}
        <div className={`pointer-events-none absolute right-0 top-0 h-full w-12 z-20 bg-gradient-to-l from-[#060811]/80 to-transparent transition-opacity duration-300 ${canScrollStart ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`pointer-events-none absolute left-0 top-0 h-full w-12 z-20 bg-gradient-to-r from-[#060811]/80 to-transparent transition-opacity duration-300 ${canScrollEnd ? 'opacity-100' : 'opacity-0'}`} />

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
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ios-button ${
                      accentColor === 'red' 
                        ? 'text-white' 
                        : 'text-white'
                    }`}>
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
