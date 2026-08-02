'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getVideoImageUrl } from '@/utils/imageHelper';

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
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const thumbnailsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Layout Engine Refs & State
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);
  const rightArrowRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState({ paddingBottom: 180, paddingRight: 128, isShortScreen: false });

  // Dynamic Layout Algorithm
  useEffect(() => {
    const calculateLayout = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 1024) return; // Only process on Desktop (lg and above)

      let newPaddingBottom = 180;
      let newPaddingRight = 128;

      if (thumbnailsContainerRef.current) {
        const thumbHeight = thumbnailsContainerRef.current.offsetHeight;
        newPaddingBottom = thumbHeight + 20;
      }

      if (rightArrowRef.current) {
        const arrowWidth = rightArrowRef.current.offsetWidth;
        newPaddingRight = arrowWidth + 40;
      }

      const isShortScreen = window.innerHeight < 750;

      setLayout({
        paddingBottom: newPaddingBottom,
        paddingRight: newPaddingRight,
        isShortScreen,
      });
    };

    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);
  }, []);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailsRef.current[activeIndex]) {
      thumbnailsRef.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    if (videos.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % videos.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [videos.length]);

  const triggerSlideChange = (nextIndex: number) => {
    if (nextIndex === activeIndex) return;
    setActiveIndex(nextIndex);
  };

  if (!videos || videos.length === 0) return null;

  const current = videos[activeIndex];

  const titleLength = current.ar_title ? current.ar_title.length : 0;
  let titleFontSizeClass = 'text-3xl sm:text-4xl lg:text-5xl';
  if (titleLength > 35) {
    titleFontSizeClass = 'text-xl sm:text-2xl lg:text-3xl';
  } else if (titleLength > 24) {
    titleFontSizeClass = 'text-2xl sm:text-3xl lg:text-4xl';
  }

  const currentImgSrc = failedImages[current.nb]
    ? getVideoImageUrl(current, 'poster')
    : getVideoImageUrl(current, 'cover');

  return (
    <div className="w-full relative mt-0 bg-transparent group flex flex-col lg:block">
      {/* Background Image Carousel Slider */}
      <div className="relative lg:absolute inset-0 w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-full lg:min-h-[500px] overflow-hidden bg-gradient-to-r from-[#140508] via-[#090d16] to-[#050811]">
        {/* Ambient Glow Orbs to prevent black Void if image is loading or dark */}
        <div className="absolute -top-24 right-10 size-96 rounded-full bg-red-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 size-96 rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />

        {videos.map((video, idx) => {
          const imgSrc = failedImages[video.nb]
            ? getVideoImageUrl(video, 'poster')
            : getVideoImageUrl(video, 'cover');

          return (
            <div
              key={video.nb}
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
                activeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {imgSrc && (
                <Image
                  src={imgSrc}
                  alt={video.ar_title}
                  fill
                  priority={idx === 0}
                  unoptimized
                  onError={() => {
                    setFailedImages((prev) => ({ ...prev, [video.nb]: true }));
                  }}
                  className={`object-cover object-top lg:object-center transform transition-transform duration-[10s] ease-out ${
                    activeIndex === idx ? 'scale-105' : 'scale-100'
                  }`}
                />
              )}
            </div>
          );
        })}

        {/* Bottom & Side Gradients for seamless page transition */}
        <div className="hidden lg:block absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#070a11] via-[#070a11]/80 to-transparent z-[2]" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-[#070a11]/90 via-[#070a11]/50 to-transparent z-[2]" />
        <div className="hidden lg:block absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#070a11]/60 to-transparent z-[2]" />
        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-[#070a11] via-[#070a11]/40 to-transparent z-[2]" />

        {/* Mobile "Watch Now" Button */}
        <div className="absolute bottom-3 right-4 z-10 lg:hidden">
          <Link
            href={`/watch/${current.nb}?title=${encodeURIComponent(current.ar_title || current.en_title || '')}`}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-full font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg"
          >
            <span>شاهد الآن</span>
            <i className="fa-solid fa-play text-xs mt-0.5" />
          </Link>
        </div>

        {/* Navigation Arrows */}
        {videos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => triggerSlideChange((activeIndex + 1) % videos.length)}
              className="group/arrow absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 size-11 sm:size-13 rounded-full bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-2xl"
              aria-label="Next Slide"
            >
              <i className="fa-solid fa-chevron-left text-lg sm:text-xl text-white drop-shadow-md" />
            </button>

            <button
              ref={rightArrowRef}
              type="button"
              onClick={() => triggerSlideChange((activeIndex - 1 + videos.length) % videos.length)}
              className="group/arrow absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 size-11 sm:size-13 rounded-full bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-2xl"
              aria-label="Previous Slide"
            >
              <i className="fa-solid fa-chevron-right text-lg sm:text-xl text-white drop-shadow-md" />
            </button>
          </>
        )}
      </div>

      {/* Content Overlay - Shown on Desktop */}
      <div
        className="hidden lg:flex relative z-30 w-full flex-col justify-end lg:h-[520px] lg:min-h-[480px] lg:max-h-[560px] pt-24 pointer-events-none transition-all duration-300"
        style={{ paddingBottom: `${layout.paddingBottom}px` }}
      >
        <div
          className="max-w-screen-2xl mx-auto pl-16 w-full flex flex-col justify-end mb-4 sm:mb-6 mt-auto transition-all duration-300"
          style={{ paddingRight: `${layout.paddingRight}px` }}
        >
          <div
            key={current.nb}
            className="max-w-3xl relative animate-fade-in-up transform text-right flex flex-col justify-end min-h-[220px] sm:min-h-[260px]"
          >
            <div className="flex-grow flex flex-col justify-end">
              <div className="flex flex-wrap items-center justify-start gap-3 mb-3 relative z-10 text-sm font-semibold text-gray-100">
                {current.kind === '2' ? (
                  <span className="text-white drop-shadow">مسلسل</span>
                ) : (
                  <span className="text-white drop-shadow">فيلم</span>
                )}
                <span className="size-1.5 rounded-full bg-gray-400/80" />
                <span className="font-mono tracking-wider drop-shadow">{current.year}</span>
                <span className="size-1.5 rounded-full bg-gray-400/80" />
                <span className="flex items-center gap-1.5 text-yellow-400 drop-shadow">
                  <i className="fa-solid fa-star text-xs" />
                  <span className="font-mono mt-0.5">{current.stars}</span>
                </span>
                <span className="px-2 py-0.5 ml-2 bg-red-600 text-white text-xs font-bold rounded shadow-sm">
                  حصرياً
                </span>
              </div>

              <h1 className={`${titleFontSizeClass} font-black text-white mb-2 leading-tight drop-shadow-lg relative z-10`}>
                {current.ar_title}
              </h1>
              {current.en_title && current.en_title !== current.ar_title && (
                <h2 className="text-sm sm:text-base text-gray-300 font-bold font-mono mb-3 drop-shadow relative z-10 tracking-widest uppercase">
                  {current.en_title}
                </h2>
              )}

              <p className={`text-slate-200 text-sm sm:text-base mb-5 leading-relaxed max-w-xl font-medium drop-shadow relative z-10 ${layout.isShortScreen ? 'line-clamp-2' : 'line-clamp-3'}`}>
                {current.ar_content}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-4 relative z-[100] mt-auto pointer-events-auto">
              <Link
                href={`/watch/${current.nb}?title=${encodeURIComponent(current.ar_title || current.en_title || '')}`}
                className="flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-extrabold text-sm sm:text-base bg-red-600 text-white hover:bg-red-700 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>شاهد الآن</span>
                <i className="fa-solid fa-play text-xs mt-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Thumbnail Selector Bar */}
        {videos.length > 1 && (
          <div
            ref={thumbnailsContainerRef}
            className="absolute bottom-6 left-12 right-12 z-40 flex items-center justify-start gap-3 overflow-x-auto custom-scrollbar py-2 px-2 pointer-events-auto"
          >
            {videos.map((video, idx) => (
              <button
                key={video.nb}
                ref={(el) => {
                  thumbnailsRef.current[idx] = el;
                }}
                type="button"
                onClick={() => triggerSlideChange(idx)}
                className={`relative shrink-0 w-24 h-14 sm:w-32 sm:h-18 rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                  activeIndex === idx
                    ? 'border-red-500 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
              >
                <Image
                  src={getVideoImageUrl(video, 'poster')}
                  alt={video.ar_title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
