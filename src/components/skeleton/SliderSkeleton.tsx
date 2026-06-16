import React from 'react';
import CardSkeleton from './CardSkeleton';

export default function SliderSkeleton() {
  const items = Array.from({ length: 6 }); // Show enough cards to fill the slider width
  
  return (
    <div className="w-full relative px-4 sm:px-6 lg:px-8 py-6" dir="rtl">
      {/* Title Section Skeleton */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-white/10 rounded-full animate-pulse"></div>
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
