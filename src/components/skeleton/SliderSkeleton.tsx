'use client';

import React from 'react';
import CardSkeleton from './CardSkeleton';

export default function SliderSkeleton() {
  // Render a fixed number of items (10 is enough to overflow even on ultra-wide screens).
  // CSS overflow-hidden handles the rest smoothly across all devices without JS recalculation.
  const items = Array.from({ length: 10 });
  
  return (
    <div className="w-full relative px-4 sm:px-6 lg:px-8 py-6" dir="rtl">
      {/* Title Section Skeleton */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-[#E50914]/80 rounded-full animate-pulse shadow-inner"></div>
          <div>
            <div className="h-6 w-40 bg-[#141722] rounded-md mb-2 animate-pulse"></div>
            <div className="h-4 w-60 bg-[#141722]/50 rounded-md animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Slider Container Skeleton */}
      <div className="relative group overflow-hidden">
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
