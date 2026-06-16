'use client';

import React, { useState, useEffect } from 'react';
import CardSkeleton from './CardSkeleton';

export default function SliderSkeleton() {
  const [count, setCount] = useState(6); // Default for SSR
  
  useEffect(() => {
    // 🧠 Smart AI Engine for Horizontal Sliders
    const calculateSmartCount = () => {
      const width = window.innerWidth;
      
      // Card widths from tailwind classes: w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] xl:w-[220px]
      let cardWidth = 140;
      if (width >= 1280) cardWidth = 220;
      else if (width >= 1024) cardWidth = 200;
      else if (width >= 768) cardWidth = 180;
      else if (width >= 640) cardWidth = 160;

      // Card gap is 1rem (16px)
      const exactCards = Math.ceil(width / (cardWidth + 16)) + 1; // +1 to ensure it overflows slightly like a real carousel
      setCount(exactCards);
    };

    calculateSmartCount();
    window.addEventListener('resize', calculateSmartCount);
    return () => window.removeEventListener('resize', calculateSmartCount);
  }, []);

  const items = Array.from({ length: count });
  
  return (
    <div className="w-full relative px-4 sm:px-6 lg:px-8 py-6" dir="rtl">
      {/* Title Section Skeleton */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-white/10 rounded-full animate-pulse shadow-inner"></div>
          <div>
            <div className="h-6 w-40 bg-white/10 rounded-md mb-2 animate-pulse"></div>
            <div className="h-4 w-60 bg-white/5 rounded-md animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Slider Container Skeleton */}
      <div className="relative group">
        <div className="flex overflow-hidden gap-4 pb-8 hide-scrollbar">
          {items.map((_, i) => (
            <div 
              key={i} 
              className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] xl:w-[220px]"
            >
              <CardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
