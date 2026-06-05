'use client';

import React, { useRef } from 'react';
import Link from 'next/link';

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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 500;
      // In RTL: scrolling left is forward, scrolling right is backward
      const amount = direction === 'left' ? -scrollAmount : scrollAmount;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (!videos || videos.length === 0) return null;

  return (
    <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 group/slider">
      {/* Slider Title Header */}
      <div className="flex items-end justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-1.5 h-9 rounded-full shadow-lg ${
            accentColor === 'red' 
              ? 'bg-alex-primary shadow-[0_0_10px_rgba(229,9,20,0.5)]' 
              : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
          }`}></div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-gray-400 mt-1 text-sm font-medium">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Slider Container Wrapper */}
      <div className="relative">
        {/* Navigation Arrows */}
        <button 
          onClick={() => scroll('left')}
          className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-alex-primary to-[#b80009] text-white items-center justify-center transition-all duration-300 lg:opacity-0 lg:group-hover/slider:opacity-100 opacity-100 shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:scale-110 active:scale-95 cursor-pointer select-none"
          aria-label="Scroll Left"
        >
          <i className="fa-solid fa-chevron-left text-sm lg:text-lg"></i>
        </button>

        <button 
          onClick={() => scroll('right')}
          className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-alex-primary to-[#b80009] text-white items-center justify-center transition-all duration-300 lg:opacity-0 lg:group-hover/slider:opacity-100 opacity-100 shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:scale-110 active:scale-95 cursor-pointer select-none"
          aria-label="Scroll Right"
        >
          <i className="fa-solid fa-chevron-right text-sm lg:text-lg"></i>
        </button>

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
                href={`/watch/${video.nb}`} 
                className="w-[170px] sm:w-[190px] flex-shrink-0 group/card block relative snap-start"
                style={{ animationDelay: `${index * 25}ms` }}
              >
                {/* Poster Wrapper */}
                <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                  <img 
                    src={`https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=https://cnth2.shabakaty.com/vascin-poster-images/${video.img}`} 
                    alt={video.ar_title} 
                    className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
                    loading="lazy"
                  />
                  <div className="movie-card-overlay"></div>

                  {/* Play Hover Indicator */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-md ${
                      accentColor === 'red' 
                        ? 'bg-alex-primary/90 shadow-[0_0_20px_rgba(229,9,20,0.5)]' 
                        : 'bg-alex-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
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
