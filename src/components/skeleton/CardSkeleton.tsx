import React from 'react';

export default function CardSkeleton() {
  return (
    <div className="w-full space-y-3 animate-pulse" dir="rtl">
      {/* Poster Container Skeleton */}
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d121d] shadow-lg">
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        {/* Rating Badge Overlay */}
        <div className="absolute top-2.5 left-2.5 h-6 w-10 rounded-lg bg-white/10" />
      </div>

      {/* Title & Metadata Skeleton */}
      <div className="space-y-2 px-1">
        <div className="h-4 w-5/6 rounded-md bg-white/10" />
        <div className="flex items-center justify-between">
          <div className="h-3 w-12 rounded bg-white/5" />
          <div className="h-3 w-16 rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}
