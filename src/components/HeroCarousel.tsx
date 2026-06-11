'use client';
import { encodeProxyUrl } from '@/utils/proxyHelper';

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

  // Build the correct landscape cover image URL (proxy all external URLs)
  const coverImgUrl = current.imgObjUrl 
    ? `/api/proxy?endpoint=${encodeProxyUrl(current.imgObjUrl)}`
    : `/api/proxy?endpoint=${encodeProxyUrl(current.img.startsWith('http') ? current.img : 'https://cnth2.shabakaty.com/vascin-cover-images/' + current.img)}`;

  return (
    <div className="relative w-full h-[85svh] min-h-[600px] sm:min-h-[auto] sm:h-[580px] lg:h-[85vh] flex flex-col justify-end mt-0 overflow-hidden bg-[#070a13] select-none group">
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
        
        {/* Gradients blending cover image into the website background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/40 sm:via-[#070a13]/20 to-transparent z-[2]"></div>
        {/* Right gradient for text readability (RTL) - Full height, but semi-transparent on mobile for glassy navbar */}
        <div className="absolute inset-y-0 right-0 w-[95%] md:w-[60%] lg:w-[50%] bg-gradient-to-l from-[#070a13]/80 via-[#070a13]/60 sm:from-[#070a13] sm:via-[#070a13]/80 to-transparent z-[2]"></div>
        {/* Top gradient for navbar readability if needed */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#070a13]/50 to-transparent z-[2]"></div>
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
          {/* Subtle text glow for readability over bright areas */}
          <div className="absolute inset-0 bg-black/20 blur-3xl rounded-full pointer-events-none -z-10"></div>
          
          <div className="flex flex-wrap items-center justify-start gap-3 mb-5 relative z-10">
            <span className="px-4 py-1.5 ios-active text-white text-xs font-bold rounded-md">
              حصرياً
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-bold glass-panel px-4 py-1.5 rounded-md">
              <i className="fa-solid fa-star text-xs"></i> <span className="font-en mt-0.5">{current.stars}</span>
            </span>
            <span className="text-gray-200 text-sm font-bold glass-panel px-4 py-1.5 rounded-md">
              <span className="font-en">{current.year}</span>
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white mb-3 sm:mb-4 leading-tight drop-shadow-2xl relative z-10 tracking-tight">
            {current.ar_title}
          </h1>
          {current.en_title && current.en_title !== current.ar_title && (
            <h2 className="text-lg sm:text-xl text-gray-400 font-bold font-en mb-6 drop-shadow-lg relative z-10">
              {current.en_title}
            </h2>
          )}
          
          <p className="text-gray-300 text-sm sm:text-base mb-8 line-clamp-3 leading-relaxed max-w-2xl font-medium drop-shadow-md relative z-10">
            {current.ar_content}
          </p>
          
          <div className="flex flex-wrap items-center justify-start gap-4 relative z-10">
            <Link 
              href={`/watch/${current.nb}`} 
              className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-base ${
                current.kind === '2' 
                  ? 'ios-button bg-blue-600/30 border-blue-600/50 text-white' 
                  : 'ios-active text-white'
              }`}
            >
              <i className="fa-solid fa-play ml-1"></i>
              <span>شاهد الآن</span>
            </Link>
            {current.trailer && (
              <a href={current.trailer} target="_blank" rel="noreferrer" className="flex items-center gap-3 ios-button text-white px-8 py-3.5 rounded-xl font-bold text-base">
                <i className="fa-solid fa-film ml-1"></i>
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

      {/* Slide Indicators / Thumbnails Row (Cinemana Style) */}
      {videos.length > 1 && (
        <div className="w-full z-20 mt-auto">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar w-full pt-4 pb-4 sm:pt-6 sm:pb-6 scroll-smooth">
            {/* Start spacer to replace padding and avoid RTL bugs */}
            <div className="w-1 sm:w-4 shrink-0 pointer-events-none opacity-0"></div>
            {videos.map((video, idx) => {
            const thumbUrl = video.imgObjUrl 
              ? `/api/proxy?endpoint=${encodeProxyUrl(video.imgObjUrl)}`
              : `/api/proxy?endpoint=${encodeProxyUrl(video.img.startsWith('http') ? video.img : 'https://cnth2.shabakaty.com/vascin-cover-images/' + video.img)}`;
            return (
              <button
                key={video.nb}
                ref={(el) => {
                  thumbnailsRef.current[idx] = el;
                }}
                onClick={() => triggerSlideChange(idx)}
                className={`relative w-28 sm:w-36 md:w-48 lg:w-56 aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all duration-300 md:hover:scale-105 transform-gpu backface-hidden will-change-transform flex-shrink-0 cursor-pointer select-none ${
                  activeIndex === idx 
                    ? 'border-alex-primary shadow-[0_0_12px_rgba(229,9,20,0.6)] scale-105' 
                    : 'border-white/10 md:hover:border-white/30'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              >
                <Image 
                  src={thumbUrl} 
                  alt={video.ar_title}
                  fill
                  sizes="(max-width: 640px) 112px, 224px"
                  className="w-full h-full object-cover transform-gpu"
                  loading="lazy"
                  style={{ imageRendering: 'high-quality' as any }}
                />
                <div className={`absolute inset-0 transition-colors duration-300 ${
                  activeIndex === idx ? 'bg-transparent' : 'bg-black/50 md:hover:bg-black/35'
                }`}></div>
              </button>
            );
          })}
            {/* End spacer to replace padding and avoid RTL bugs */}
            <div className="w-1 sm:w-4 shrink-0 pointer-events-none opacity-0"></div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
