import React from 'react';

export default function CardSkeleton() {
  return (
    <div className="block relative snap-start animate-pulse w-full">
      {/* Poster Skeleton */}
      <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden bg-[#141722] border border-white/[0.07] shadow-inner"></div>

      {/* Info Details Skeleton */}
      <div className="mt-3 px-1 space-y-2">
        {/* Title & Rating Row */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="h-4 bg-[#141722]/80 rounded-md flex-grow"></div>
          <div className="h-4 w-12 bg-[#141722]/80 rounded-md flex-shrink-0"></div>
        </div>

        {/* Year/Type Row */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="h-3 w-10 bg-[#141722]/50 rounded-md"></div>
          <div className="h-3 w-8 bg-[#141722]/50 rounded-md"></div>
        </div>
      </div>
    </div>
  );
}
