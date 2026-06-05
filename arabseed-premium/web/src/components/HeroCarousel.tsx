'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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
  const coverImgUrl = current.imgObjUrl || `https://cnth2.shabakaty.com/vascin-cover-images/${current.img}`;

  return (
    <div className="relative w-full h-[650px] lg:h-[85vh] flex flex-col justify-end mt-0 overflow-hidden bg-black select-none group">
      {/* Background Image Carousel Slider */}
      <div className="absolute inset-0 w-full h-full">
        <div 
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
            fade ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src={coverImgUrl} 
            alt={current.ar_title} 
            className="w-full h-full object-cover object-center transform scale-100 transition-transform duration-[7s] hover:scale-105"
          />
        </div>
        
        {/* Gradients blending cover image into the website background */}
        {/* Bottom vertical fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/10 to-transparent z-[2]"></div>
      </div>
      
      {/* Carousel Content */}
      <div className="relative z-10 w-full flex flex-col justify-between h-full pt-24 lg:pt-32 pb-4 sm:pb-6">
        
        {/* Top Text Section */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex flex-col justify-center mb-8">
        <div 
          className={`max-w-3xl relative transition-all duration-500 transform text-right ${
            fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Smart localized dark aura exactly behind the text */}
          <div className="absolute -inset-y-24 -inset-x-24 bg-black/60 blur-[80px] pointer-events-none -z-10 rounded-full"></div>
          <div className="absolute -inset-y-12 -inset-x-12 bg-black/80 blur-[40px] pointer-events-none -z-10 rounded-full"></div>

          {/* Decorative Glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-alex-primary/20 rounded-full blur-[100px] pointer-events-none animate-glow"></div>
          
          <div className="flex flex-wrap items-center justify-start gap-3 mb-5 relative z-10">
            <span className="px-4 py-1.5 bg-alex-primary text-white text-xs font-bold rounded-md shadow-[0_0_15px_rgba(229,9,20,0.5)]">
              حصرياً
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-bold glass-panel px-4 py-1.5 rounded-md">
              <i className="fa-solid fa-star text-xs"></i> <span className="font-en mt-0.5">{current.stars}</span>
            </span>
            <span className="text-gray-200 text-sm font-bold glass-panel px-4 py-1.5 rounded-md">
              <span className="font-en">{current.year}</span>
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight drop-shadow-2xl relative z-10 tracking-tight">
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
            <Link href={`/watch/${current.nb}`} className="flex items-center gap-3 btn-primary text-white px-8 py-3.5 rounded-xl font-bold text-base hover-scale">
              <i className="fa-solid fa-play ml-1"></i>
              <span>شاهد الآن</span>
            </Link>
            {current.trailer && (
              <a href={current.trailer} target="_blank" rel="noreferrer" className="flex items-center gap-3 glass-panel text-white hover:bg-white/10 px-8 py-3.5 rounded-xl font-bold text-base transition-all hover-scale">
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
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/40 hover:bg-alex-primary/95 text-white border border-white/5 flex items-center justify-center transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Next Slide"
          >
            <i className="fa-solid fa-chevron-left text-lg"></i>
          </button>
          
          {/* Right Arrow (Goes to Previous in RTL because previous items are on the right) */}
          <button 
            onClick={() => triggerSlideChange((activeIndex - 1 + videos.length) % videos.length)}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/40 hover:bg-alex-primary/95 text-white border border-white/5 flex items-center justify-center transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Previous Slide"
          >
            <i className="fa-solid fa-chevron-right text-lg"></i>
          </button>
        </>
      )}

      {/* Slide Indicators / Thumbnails Row (Cinemana Style) */}
      {videos.length > 1 && (
        <div className="w-full z-20 mt-auto">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar w-full pt-6 pb-6 scroll-smooth">
            {/* Start spacer to replace padding and avoid RTL bugs */}
            <div className="w-1 sm:w-4 shrink-0 pointer-events-none opacity-0"></div>
          {videos.map((video, idx) => {
            const thumbUrl = video.imgObjUrl || `https://cnth2.shabakaty.com/vascin-cover-images/${video.img}`;
            return (
              <button
                key={video.nb}
                ref={(el) => {
                  thumbnailsRef.current[idx] = el;
                }}
                onClick={() => triggerSlideChange(idx)}
                className={`relative w-28 sm:w-36 md:w-48 lg:w-56 aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 transform-gpu backface-hidden will-change-transform flex-shrink-0 cursor-pointer select-none ${
                  activeIndex === idx 
                    ? 'border-alex-primary shadow-[0_0_12px_rgba(229,9,20,0.6)] scale-105' 
                    : 'border-white/10 hover:border-white/30'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              >
                <img 
                  src={thumbUrl} 
                  alt={video.ar_title} 
                  className="w-full h-full object-cover transform-gpu"
                  loading="lazy"
                  style={{ imageRendering: 'high-quality' as any }}
                />
                <div className={`absolute inset-0 transition-colors duration-300 ${
                  activeIndex === idx ? 'bg-transparent' : 'bg-black/50 hover:bg-black/35'
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
