'use client';
import { getVideoImageUrl } from '@/utils/imageHelper';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Video {
  nb: string;
  ar_title: string;
  en_title?: string;
  ar_content: string;
  img: string;
  imgObjUrl?: string;
  stars: string;
  year: string;
  trailer?: string;
  kind?: string;
}

interface HeroCarouselProps {
  videos: Video[];
}

export default function HeroCarousel({ videos }: HeroCarouselProps) {
  const [bgIndex, setBgIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const thumbnailsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailsRef.current[activeIndex]) {
      thumbnailsRef.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    if (videos.length <= 1) return;
    const interval = setInterval(() => {
      triggerSlideChange((activeIndex + 1) % videos.length);
    }, 7000); // 7 seconds per slide for better readability
    return () => clearInterval(interval);
  }, [activeIndex, videos.length]);

  const triggerSlideChange = (nextIndex: number) => {
    if (nextIndex === activeIndex) return;
    
    // Update thumbnail highlight and scroll instantly
    setActiveIndex(nextIndex);
    
    // Cross-fade the background and text
    setFade(false);
    setTimeout(() => {
      setBgIndex(nextIndex);
      setFade(true);
    }, 300); // Matches transition time
  };

  if (!videos || videos.length === 0) return null;

  const current = videos[bgIndex];

  // Build the correct landscape cover image URL
  const coverImgUrl = getVideoImageUrl(current, 'cover');

  return (
    <div className="relative w-full h-[85svh] min-h-[600px] sm:min-h-[auto] sm:h-[580px] lg:h-[85vh] flex flex-col justify-end mt-0 overflow-hidden bg-transparent select-none group">
      {/* Background Image Carousel Slider */}
      <div className="absolute inset-0 w-full h-full">
        <div 
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
            fade ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image 
            src={coverImgUrl} 
            alt={current.ar_title} 
            fill
            priority
            className="object-cover object-center transform scale-100 transition-transform duration-[7s] hover:scale-105"
          />
        </div>
        
        {/* 2026 Cinematic Gradients: Ultra-smooth blending without harsh boxes */}
        {/* Deep bottom gradient to seamlessly blend into the page and provide a dark base for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/70 sm:via-[#070a13]/50 to-transparent z-[2]"></div>
        {/* Soft, expansive side gradient tailored for RTL readability without cutting the image */}
        <div className="absolute inset-y-0 right-0 w-full sm:w-[70%] lg:w-[50%] bg-gradient-to-l from-[#070a13]/90 via-[#070a13]/40 to-transparent z-[2]"></div>
        {/* Top subtle vignette */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#070a13]/60 to-transparent z-[2]"></div>
      </div>
      
      {/* Content Overlay */}
      <div className="relative z-10 w-full flex flex-col justify-between h-full pt-20 sm:pt-20 lg:pt-32">
        
        {/* Top Text Section */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex flex-col justify-center mb-8 mt-10 lg:mt-0">
        <div 

          className={`max-w-3xl relative transition-all duration-500 transform text-right drop-shadow-2xl ${
            fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Subtle base shadow for text to pop against any background naturally */}
          
          {/* Metadata Row: Clean, minimalist, and easy to scan */}
          <div className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 mb-4 relative z-10 text-sm md:text-base font-semibold text-gray-200">
            {current.kind === '2' && (
               <span className="text-white drop-shadow-md">مسلسل</span>
            )}
            {current.kind !== '2' && (
               <span className="text-white drop-shadow-md">فيلم</span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500/80"></span>
            <span className="font-en tracking-wider drop-shadow-md">{current.year}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500/80"></span>
            <span className="flex items-center gap-1.5 text-yellow-400 drop-shadow-md">
              <i className="fa-solid fa-star text-xs"></i> 
              <span className="font-en mt-0.5">{current.stars}</span>
            </span>
            <span className="px-2 py-0.5 ml-2 bg-red-600 text-white text-xs font-bold rounded shadow-sm">
              حصرياً
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-1 leading-tight drop-shadow-lg relative z-10">
            {current.ar_title}
          </h1>
          {current.en_title && current.en_title !== current.ar_title && (
            <h2 className="text-base sm:text-xl text-gray-300 font-bold font-en mb-5 drop-shadow-md relative z-10 tracking-[0.15em] uppercase">
              {current.en_title}
            </h2>
          )}
          
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg mb-8 line-clamp-3 leading-relaxed max-w-xl font-medium drop-shadow-md relative z-10">
            {current.ar_content}
          </p>
          
          <div className="flex flex-wrap items-center justify-start gap-4 relative z-10">
            <Link 
              href={`/watch/${current.nb}`} 
              className="flex items-center justify-center gap-3 px-8 sm:px-10 py-3 sm:py-3.5 rounded-md font-bold text-sm sm:text-base bg-white text-black hover:bg-white/90 transition-all duration-300 shadow-lg"
            >
              <i className="fa-solid fa-play text-lg"></i>
              <span>شاهد الآن</span>
            </Link>
            {current.trailer && (
              <a href={current.trailer} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 px-8 sm:px-10 py-3 sm:py-3.5 rounded-md font-bold text-sm sm:text-base bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all duration-300 shadow-lg">
                <i className="fa-regular fa-circle-play text-xl"></i>
                <span>الإعلان الترويجي</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Manual Controls Left & Right Arrows (Hidden on Mobile, Visible on hover) */}
      {videos.length > 1 && (
        <>
          {/* Left Arrow (Goes to Next in RTL because next items are on the left) */}
          <button 
            onClick={() => triggerSlideChange((activeIndex + 1) % videos.length)}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 md:hover:bg-alex-primary/95 text-white border border-white/10 flex items-center justify-center transition-all duration-300 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 opacity-70 md:hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Next Slide"
          >
            <i className="fa-solid fa-chevron-left text-lg"></i>
          </button>
          
          {/* Right Arrow (Goes to Previous in RTL because previous items are on the right) */}
          <button 
            onClick={() => triggerSlideChange((activeIndex - 1 + videos.length) % videos.length)}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 md:hover:bg-alex-primary/95 text-white border border-white/10 flex items-center justify-center transition-all duration-300 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 opacity-70 md:hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Previous Slide"
          >
            <i className="fa-solid fa-chevron-right text-lg"></i>
          </button>
        </>
      )}

      {/* Slide Indicators / Thumbnails Row (Apple TV+ / Netflix Style) */}
      {videos.length > 1 && (
        <div className="w-full z-20 mt-auto pb-0 sm:pb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/80 to-transparent pointer-events-none -z-10"></div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar w-full px-4 lg:px-8 py-6 scroll-smooth items-end">
            {videos.map((video, idx) => {
            const thumbUrl = getVideoImageUrl(video, 'cover');
            return (
              <button
                key={video.nb}
                ref={(el) => {
                  thumbnailsRef.current[idx] = el;
                }}
                onClick={() => triggerSlideChange(idx)}
                className={`relative aspect-[16/9] rounded-xl overflow-hidden transition-all duration-300 transform-gpu backface-hidden will-change-transform flex-shrink-0 cursor-pointer select-none ring-1 ring-white/10 ${
                  activeIndex === idx 
                    ? 'w-32 sm:w-44 md:w-56 lg:w-64 border-2 border-white/80 shadow-[0_10px_25px_rgba(0,0,0,0.8)] scale-100 opacity-100 z-10' 
                    : 'w-24 sm:w-32 md:w-40 lg:w-48 border border-transparent opacity-50 hover:opacity-100 hover:scale-105 z-0'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              >
                <Image 
                  src={thumbUrl} 
                  alt={video.ar_title}
                  fill
                  sizes="(max-width: 640px) 128px, 256px"
                  className="w-full h-full object-cover transform-gpu"
                  loading="lazy"
                />
                <div className={`absolute inset-0 transition-colors duration-300 ${
                  activeIndex === idx ? 'bg-transparent' : 'bg-black/40 hover:bg-black/10'
                }`}></div>
              </button>
            );
          })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
