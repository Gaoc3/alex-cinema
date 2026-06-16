import React from 'react';

export default function CardSkeleton() {
  return (
    <div className="block relative snap-start animate-pulse w-full">
      {/* Poster Skeleton */}
      <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden bg-white/5 border border-white/5 shadow-inner"></div>

      {/* Info Details Skeleton */}
      <div className="mt-3 px-1 space-y-2">
        {/* Title & Rating Row */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="h-4 bg-white/10 rounded-md flex-grow"></div>
          <div className="h-4 w-12 bg-white/10 rounded-md flex-shrink-0"></div>
        </div>

        {/* Year/Type Row */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="h-3 w-10 bg-white/5 rounded-md"></div>
          <div className="h-3 w-8 bg-white/5 rounded-md"></div>
        </div>
      </div>
    </div>
  );
}
