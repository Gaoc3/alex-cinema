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
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbnailsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // AI Layout Engine Refs & State
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);
  const rightArrowRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState({ paddingBottom: 250, paddingRight: 128, isShortScreen: false });

  // AI Layout Engine Algorithm
  useEffect(() => {
    const calculateLayout = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 1024) return; // Only process on Desktop (lg and above)

      let newPaddingBottom = 250;
      let newPaddingRight = 128;
      
      // Calculate dynamic bottom padding based on actual thumbnail container height
      if (thumbnailsContainerRef.current) {
        const thumbHeight = thumbnailsContainerRef.current.offsetHeight;
        newPaddingBottom = thumbHeight + 30; // 30px safe margin above thumbnails
      }

      // Calculate dynamic right padding based on actual right arrow width
      if (rightArrowRef.current) {
        const arrowWidth = rightArrowRef.current.offsetWidth;
        newPaddingRight = arrowWidth + 40; // 40px safe margin away from arrow
      }

      const isShortScreen = window.innerHeight < 750;

      setLayout({
        paddingBottom: newPaddingBottom,
        paddingRight: newPaddingRight,
        isShortScreen
      });
    };

    calculateLayout();
    
    // Add event listener for live resizing
    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);
  }, []);

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
      setActiveIndex((currentIndex) => (currentIndex + 1) % videos.length);
    }, 7000); // 7 seconds per slide for better readability
    return () => clearInterval(interval);
  }, [videos.length]);

  const triggerSlideChange = (nextIndex: number) => {
    if (nextIndex === activeIndex) return;
    setActiveIndex(nextIndex);
  };

  if (!videos || videos.length === 0) return null;

  const current = videos[activeIndex];

  // Dynamic font sizing based on title length to prevent ugly text wrapping
  const titleLength = current.ar_title ? current.ar_title.length : 0;
  let titleFontSizeClass = "text-3xl sm:text-5xl lg:text-6xl";
  if (titleLength > 35) {
    titleFontSizeClass = "text-xl sm:text-2xl lg:text-3xl";
  } else if (titleLength > 24) {
    titleFontSizeClass = "text-2xl sm:text-3xl lg:text-4xl";
  } else if (titleLength > 16) {
    titleFontSizeClass = "text-3xl sm:text-4xl lg:text-5xl";
  }

  return (
    <div className="w-full relative mt-0 bg-transparent group flex flex-col lg:block">
      {/* Background Image Carousel Slider (Acts as the Banner on Mobile, Full BG on Desktop) */}
      <div className="relative lg:absolute inset-0 w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-full lg:min-h-[600px] overflow-hidden bg-[#06070a]">
        {videos.map((video, idx) => (
          <div 
            key={video.nb}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
              activeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <Image 
              src={getVideoImageUrl(video, 'cover')} 
              alt={video.ar_title} 
              fill
              priority={idx === 0}
              unoptimized
              className={`object-cover object-top lg:object-center transform transition-transform duration-[10s] ease-out ${
                activeIndex === idx ? 'scale-105' : 'scale-100'
              }`}
            />
          </div>
        ))}
        
        {/* Soft, natural gradients for text contrast without harsh dark ruler bars */}
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/20 to-transparent z-[2]"></div>
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[45%] bg-gradient-to-l from-[#06070a]/50 via-[#06070a]/10 to-transparent z-[2]"></div>
        <div className="hidden lg:block absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#06070a]/20 to-transparent z-[2]"></div>
        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-[#06070a]/40 via-transparent to-transparent z-[2]"></div>
        
        {/* Mobile "Watch Now" Button (Cinemana Style) */}
        <div className="absolute bottom-3 right-4 z-10 lg:hidden">
            <Link 
              href={`/watch/${current.nb}?title=${encodeURIComponent(current.ar_title || current.en_title || '')}`} 
              className="flex items-center justify-center gap-2 px-5 py-1.5 rounded-full font-bold text-sm bg-alex-primary text-white hover:bg-red-700 transition-all shadow-lg"
            >
              <span>شاهد الآن</span>
              <i className="fa-solid fa-play text-xs mt-0.5"></i>
            </Link>
        </div>

        {/* Manual Controls Left & Right Floating Glass Arrows */}
        {videos.length > 1 && (
          <>
            {/* Left Arrow */}
            <button 
              onClick={() => triggerSlideChange((activeIndex + 1) % videos.length)}
              className="group/arrow absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/20 hover:bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 opacity-75 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer outline-none select-none shadow-2xl"
              aria-label="Next Slide"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <i className="fa-solid fa-chevron-left text-lg sm:text-2xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"></i>
            </button>
            
            {/* Right Arrow */}
            <button 
              ref={rightArrowRef}
              onClick={() => triggerSlideChange((activeIndex - 1 + videos.length) % videos.length)}
              className="group/arrow absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/20 hover:bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 opacity-75 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer outline-none select-none shadow-2xl"
              aria-label="Previous Slide"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <i className="fa-solid fa-chevron-right text-lg sm:text-2xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"></i>
            </button>
          </>
        )}
      </div>
      
      {/* Content Overlay - Hidden on Mobile, Shown on Desktop */}
      <div 
        className="hidden lg:flex relative z-30 w-full flex-col justify-end lg:h-[85vh] lg:min-h-[600px] lg:max-h-[700px] pt-32 pointer-events-none transition-all duration-300"
        style={{ paddingBottom: `${layout.paddingBottom}px` }}
      >
        
        {/* Top Text Section */}
        <div 
           className="max-w-screen-2xl mx-auto pl-16 w-full flex flex-col justify-end mb-6 sm:mb-8 mt-auto transition-all duration-300"
           style={{ paddingRight: `${layout.paddingRight}px` }}
        >
        <div 
          key={current.nb}
          className="max-w-3xl relative animate-fade-in-up transform text-right flex flex-col justify-end min-h-[260px] sm:min-h-[300px] lg:min-h-[340px]"
        >
          <div className="flex-grow flex flex-col justify-end">
            {/* Metadata Row: Clean, minimalist, and easy to scan */}
            <div className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 mb-4 relative z-10 text-sm md:text-base font-semibold text-gray-100">
              {current.kind === '2' && (
                 <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">مسلسل</span>
              )}
              {current.kind !== '2' && (
                 <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">فيلم</span>
              )}
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400/80"></span>
              <span className="font-en tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{current.year}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400/80"></span>
              <span className="flex items-center gap-1.5 text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                <i className="fa-solid fa-star text-xs"></i> 
                <span className="font-en mt-0.5">{current.stars}</span>
              </span>
              <span className="px-2 py-0.5 ml-2 bg-red-600 text-white text-xs font-bold rounded shadow-sm">
                حصرياً
              </span>
            </div>
            
            <h1 className={`${titleFontSizeClass} font-black text-white mb-2 leading-tight drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)] relative z-10`}>
              {current.ar_title}
            </h1>
            {current.en_title && current.en_title !== current.ar_title && (
              <h2 className="text-sm sm:text-lg text-gray-200 font-bold font-en mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] relative z-10 tracking-widest uppercase">
                {current.en_title}
              </h2>
            )}
            
            <p className={`text-gray-200 text-sm sm:text-base lg:text-lg mb-6 leading-relaxed max-w-xl font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] relative z-10 ${layout.isShortScreen ? 'line-clamp-2' : 'line-clamp-3'}`}>
              {current.ar_content}
            </p>
          </div>
          
          {/* Buttons Row - Anchored to the bottom of the fixed height container */}
          <div className="flex flex-wrap items-center justify-start gap-4 relative z-[100] mt-auto pointer-events-auto">
            <Link 
              href={`/watch/${current.nb}?title=${encodeURIComponent(current.ar_title || current.en_title || '')}`} 
              className="flex items-center justify-center gap-3 px-8 sm:px-10 py-3 sm:py-3.5 rounded-md font-bold text-sm sm:text-base bg-white text-black hover:bg-white/90 transition-all duration-300 shadow-lg relative z-[100] pointer-events-auto cursor-pointer"
            >
              <i className="fa-solid fa-play text-lg pointer-events-none"></i>
              <span className="pointer-events-none">شاهد الآن</span>
            </Link>
            {current.trailer && (
              <a href={current.trailer} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 px-8 sm:px-10 py-3 sm:py-3.5 rounded-md font-bold text-sm sm:text-base bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all duration-300 shadow-lg relative z-[100] pointer-events-auto cursor-pointer">
                <i className="fa-regular fa-circle-play text-xl pointer-events-none"></i>
                <span className="pointer-events-none">الإعلان الترويجي</span>
              </a>
            )}
          </div>
        </div>
      </div>
      </div>



      {/* Slide Indicators / Thumbnails Row (Desktop: Thumbnails, Mobile: Dots) */}
      {videos.length > 1 && (
        <div ref={thumbnailsContainerRef} className="w-full z-20 relative mt-4 lg:mt-0 lg:absolute lg:bottom-0 pointer-events-none">
          <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#06070a]/90 via-[#06070a]/30 to-transparent pointer-events-none -z-10"></div>
          
          {/* Mobile Dots */}
          <div className="flex lg:hidden justify-center items-center gap-2 pb-4 pointer-events-auto">
             {videos.map((_, idx) => (
               <button 
                 key={idx}
                 onClick={() => triggerSlideChange(idx)}
                 className={`rounded-full transition-all duration-300 ${activeIndex === idx ? 'bg-alex-primary w-2.5 h-2.5' : 'bg-gray-600 w-2 h-2 hover:bg-gray-400'}`}
                 aria-label={`Go to slide ${idx + 1}`}
               />
             ))}
          </div>

          {/* Desktop Thumbnails */}
          <div className="hidden lg:flex gap-4 overflow-x-auto hide-scrollbar w-full px-8 py-6 scroll-smooth items-end pointer-events-auto">
            {videos.map((video, idx) => {
            const thumbUrl = getVideoImageUrl(video, 'cover');
            return (
              <button
                key={video.nb}
                ref={(el) => {
                  thumbnailsRef.current[idx] = el;
                }}
                onClick={() => triggerSlideChange(idx)}
                className={`relative aspect-[16/9] rounded-xl overflow-hidden transition-all duration-300 transform-gpu backface-hidden will-change-transform flex-shrink-0 cursor-pointer select-none ${
                  activeIndex === idx 
                    ? 'w-32 sm:w-44 md:w-56 lg:w-64 ring-2 ring-alex-primary shadow-[0_10px_25px_rgba(229,9,20,0.4)] scale-100 opacity-100 z-10' 
                    : 'w-24 sm:w-32 md:w-40 lg:w-48 opacity-50 hover:opacity-100 hover:scale-105 z-0'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              >
                <Image 
                  src={thumbUrl} 
                  alt={video.ar_title}
                  fill
                  unoptimized
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
  );
}
