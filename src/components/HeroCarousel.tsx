'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getVideoImageUrl } from '@/utils/imageHelper';
import { safeOpenExternalLink } from '@/lib/telegramWebAppClient';

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
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbnailsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Layout Engine Refs & State
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);
  const rightArrowRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState({ paddingBottom: 250, paddingRight: 128, isShortScreen: false });

  // Layout Engine Algorithm
  useEffect(() => {
    const calculateLayout = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 1024) return; // Desktop only

      let newPaddingBottom = 250;
      let newPaddingRight = 128;

      if (thumbnailsContainerRef.current) {
        const thumbHeight = thumbnailsContainerRef.current.offsetHeight;
        newPaddingBottom = thumbHeight + 30;
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

  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Determine items per batch based on screen breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= 1536) {
        setItemsPerPage(7);
      } else if (window.innerWidth >= 1280) {
        setItemsPerPage(6);
      } else {
        setItemsPerPage(5);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const watchUrl = `/watch/${current.nb}?title=${encodeURIComponent(current.ar_title || current.en_title || '')}`;

  const currentBatch = Math.floor(activeIndex / itemsPerPage);
  const totalBatches = Math.ceil(videos.length / itemsPerPage);

  const batches: Video[][] = [];
  for (let i = 0; i < videos.length; i += itemsPerPage) {
    batches.push(videos.slice(i, i + itemsPerPage));
  }

  const titleLength = current.ar_title ? current.ar_title.length : 0;
  let titleFontSizeClass = 'text-3xl sm:text-5xl lg:text-6xl';
  if (titleLength > 35) {
    titleFontSizeClass = 'text-xl sm:text-2xl lg:text-3xl';
  } else if (titleLength > 24) {
    titleFontSizeClass = 'text-2xl sm:text-3xl lg:text-4xl';
  } else if (titleLength > 16) {
    titleFontSizeClass = 'text-3xl sm:text-4xl lg:text-5xl';
  }

  return (
    <div className="w-full relative mt-0 bg-transparent group flex flex-col lg:block">
      {/* Background Image Carousel Slider */}
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

        {/* Crisp Gradient Overlays with pointer-events-none */}
        <div className="hidden lg:block absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-[#060811] to-transparent z-[2] pointer-events-none"></div>
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-[#060811]/85 via-[#060811]/40 to-transparent z-[2] pointer-events-none"></div>
        <div className="hidden lg:block absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#060811]/35 to-transparent z-[2] pointer-events-none"></div>
        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-[#060811]/75 via-transparent to-transparent z-[2] pointer-events-none"></div>

        {/* Mobile "Watch Now" Button */}
        <div className="absolute bottom-3 right-4 z-20 lg:hidden">
          <Link
            href={watchUrl}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-full font-bold text-sm bg-alex-primary text-white hover:bg-red-700 active:scale-95 transition-all shadow-lg cursor-pointer"
          >
            <span>شاهد الآن</span>
            <i className="fa-solid fa-play text-xs mt-0.5"></i>
          </Link>
        </div>

        {/* Navigation Arrows */}
        {videos.length > 1 && (
          <>
            {/* Left Arrow */}
            <button
              type="button"
              onClick={() => triggerSlideChange((activeIndex + 1) % videos.length)}
              className="group/arrow absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/30 hover:bg-black/70 backdrop-blur-md border border-white/15 flex items-center justify-center transition-all duration-300 opacity-75 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer outline-none select-none shadow-2xl"
              aria-label="Next Slide"
            >
              <i className="fa-solid fa-chevron-left text-lg sm:text-2xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"></i>
            </button>

            {/* Right Arrow */}
            <button
              ref={rightArrowRef}
              type="button"
              onClick={() => triggerSlideChange((activeIndex - 1 + videos.length) % videos.length)}
              className="group/arrow absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/30 hover:bg-black/70 backdrop-blur-md border border-white/15 flex items-center justify-center transition-all duration-300 opacity-75 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer outline-none select-none shadow-2xl"
              aria-label="Previous Slide"
            >
              <i className="fa-solid fa-chevron-right text-lg sm:text-2xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"></i>
            </button>
          </>
        )}
      </div>

      {/* Content Overlay on Desktop */}
      <div
        className="hidden lg:flex relative z-30 w-full flex-col justify-end lg:h-[85vh] lg:min-h-[600px] lg:max-h-[700px] pt-32 transition-all duration-300 pointer-events-none"
        style={{ paddingBottom: `${layout.paddingBottom}px` }}
      >
        <div
          className="max-w-screen-2xl mx-auto pl-16 w-full flex flex-col justify-end mb-6 sm:mb-8 mt-auto transition-all duration-300"
          style={{ paddingRight: `${layout.paddingRight}px` }}
        >
          <div
            key={current.nb}
            className="max-w-3xl relative animate-fade-in-up transform text-right flex flex-col justify-end min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] pointer-events-auto"
          >
            <div className="flex-grow flex flex-col justify-end">
              {/* Metadata Row */}
              <div className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 mb-4 relative z-10 text-sm md:text-base font-semibold text-gray-100">
                <span className="text-white [text-shadow:_0_1px_4px_rgba(0,0,0,0.8)] font-black">
                  {current.kind === '2' ? 'مسلسل' : 'فيلم'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400/80"></span>
                <span className="font-en tracking-wider [text-shadow:_0_1px_4px_rgba(0,0,0,0.8)]">{current.year}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400/80"></span>
                <span className="flex items-center gap-1.5 text-yellow-400 [text-shadow:_0_1px_4px_rgba(0,0,0,0.8)] font-black">
                  <i className="fa-solid fa-star text-xs"></i>
                  <span className="font-en mt-0.5">{current.stars}</span>
                </span>
                <span className="px-2 py-0.5 ml-2 bg-alex-primary text-white text-xs font-black rounded shadow-sm">
                  حصرياً
                </span>
              </div>

              <h1 className={`${titleFontSizeClass} font-black text-white mb-2 leading-tight [text-shadow:_0_2px_10px_rgba(0,0,0,0.7)] relative z-10`}>
                {current.ar_title}
              </h1>

              {current.en_title && current.en_title !== current.ar_title && (
                <h2 className="text-sm sm:text-lg text-gray-200 font-bold font-en mb-4 [text-shadow:_0_1px_6px_rgba(0,0,0,0.7)] relative z-10 tracking-widest uppercase" dir="ltr">
                  {current.en_title}
                </h2>
              )}

              <p className={`text-gray-200 text-sm sm:text-base lg:text-lg mb-6 leading-relaxed max-w-xl font-medium [text-shadow:_0_1px_6px_rgba(0,0,0,0.7)] relative z-10 ${layout.isShortScreen ? 'line-clamp-2' : 'line-clamp-3'}`}>
                {current.ar_content}
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-start gap-4 relative z-30 mt-auto">
              <Link
                href={watchUrl}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(watchUrl);
                }}
                className="flex items-center justify-center gap-3 px-8 sm:px-10 py-3 sm:py-3.5 rounded-xl font-black text-sm sm:text-base bg-white text-black hover:bg-alex-primary hover:text-white active:scale-95 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-pointer select-none"
              >
                <i className="fa-solid fa-play text-base"></i>
                <span>شاهد الآن</span>
              </Link>

              {current.trailer && (
                <a
                  href={current.trailer}
                  onClick={(e) => safeOpenExternalLink(current.trailer || '', e)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-3 px-8 sm:px-10 py-3 sm:py-3.5 rounded-xl font-black text-sm sm:text-base bg-white/15 text-white backdrop-blur-md hover:bg-white/25 active:scale-95 border border-white/20 transition-all duration-300 shadow-lg cursor-pointer select-none"
                >
                  <i className="fa-regular fa-circle-play text-xl"></i>
                  <span>الإعلان الترويجي</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators / Thumbnails Row */}
      {videos.length > 1 && (
        <div ref={thumbnailsContainerRef} className="w-full z-30 relative mt-4 lg:mt-0 lg:absolute lg:bottom-0 pointer-events-none">
          {/* Subtle dark backdrop */}
          <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#060811]/95 via-[#060811]/60 to-transparent pointer-events-none -z-10"></div>

          {/* Mobile Dots */}
          <div className="flex lg:hidden justify-center items-center gap-2 pb-4 pointer-events-auto">
            {videos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => triggerSlideChange(idx)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  activeIndex === idx ? 'bg-alex-primary w-3 h-3' : 'bg-gray-600 w-2 h-2 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Desktop Batch-Sliding Thumbnails (100% Full Cards, Zero Edge Cut-off) */}
          <div className="hidden lg:block relative w-full overflow-hidden px-8 sm:px-12 py-5" dir="rtl">
            {/* Batch Navigation Buttons */}
            {totalBatches > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const prevBatch = (currentBatch - 1 + totalBatches) % totalBatches;
                    setActiveIndex(prevBatch * itemsPerPage);
                  }}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 shadow-lg transition-all pointer-events-auto cursor-pointer active:scale-90"
                  aria-label="Previous batch"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextBatch = (currentBatch + 1) % totalBatches;
                    setActiveIndex(nextBatch * itemsPerPage);
                  }}
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 shadow-lg transition-all pointer-events-auto cursor-pointer active:scale-90"
                  aria-label="Next batch"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
              </>
            )}

            <div 
              className="flex transition-transform duration-500 ease-out will-change-transform w-full pointer-events-auto"
              style={{ transform: `translate3d(${currentBatch * 100}%, 0, 0)` }}
            >
              {batches.map((batch, batchIdx) => (
                <div 
                  key={batchIdx}
                  className="w-full shrink-0 grid grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5"
                >
                  {batch.map((video, itemIdx) => {
                    const globalIdx = batchIdx * itemsPerPage + itemIdx;
                    const isActive = activeIndex === globalIdx;
                    const thumbUrl = getVideoImageUrl(video, 'cover');

                    return (
                      <button
                        key={video.nb}
                        type="button"
                        onClick={() => triggerSlideChange(globalIdx)}
                        className={`relative aspect-[16/9] rounded-xl overflow-hidden transition-all duration-300 transform-gpu backface-hidden will-change-transform cursor-pointer select-none border ${
                          isActive
                            ? 'border-alex-primary ring-2 ring-alex-primary shadow-[0_6px_20px_rgba(229,9,20,0.5)] opacity-100 z-10'
                            : 'border-white/10 opacity-75 hover:opacity-100 hover:border-white/30 z-0 bg-[#060811]'
                        }`}
                        aria-label={`Go to slide ${globalIdx + 1}`}
                      >
                        <Image
                          src={thumbUrl}
                          alt={video.ar_title}
                          fill
                          unoptimized
                          className="w-full h-full object-cover transform-gpu"
                          loading="lazy"
                        />
                        <div
                          className={`absolute inset-0 transition-colors duration-300 ${
                            isActive ? 'bg-transparent' : 'bg-black/40 hover:bg-black/10'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
