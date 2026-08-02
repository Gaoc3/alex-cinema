import React from 'react';

export default function HeroSkeleton() {
  return (
    <div className="w-full relative mt-0 bg-transparent flex flex-col lg:block" dir="rtl">
      {/* Background Container Skeleton */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-[520px] lg:min-h-[480px] lg:max-h-[560px] overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0c1019]">
        {/* Shimmer Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-pulse" />

        {/* Ambient Glow */}
        <div className="absolute -top-24 right-10 size-96 rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 size-96 rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />

        {/* Desktop Gradients */}
        <div className="hidden lg:block absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#070a11] via-[#070a11]/80 to-transparent z-[2]" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-[#070a11]/90 via-[#070a11]/50 to-transparent z-[2]" />

        {/* Text Content Skeleton */}
        <div className="hidden lg:flex absolute inset-0 z-10 items-center pr-12 pl-6">
          <div className="max-w-xl space-y-4">
            {/* Type/Badge */}
            <div className="h-6 w-24 rounded-full bg-white/10 animate-pulse" />

            {/* Title */}
            <div className="h-12 w-96 rounded-xl bg-white/10 animate-pulse" />

            {/* Meta Tags (Rating, Year, Category) */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 rounded-lg bg-white/10 animate-pulse" />
              <div className="h-6 w-12 rounded-lg bg-white/10 animate-pulse" />
              <div className="h-6 w-20 rounded-lg bg-white/10 animate-pulse" />
            </div>

            {/* Description */}
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-white/5 animate-pulse" />
              <div className="h-4 w-4/6 rounded bg-white/5 animate-pulse" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <div className="h-12 w-36 rounded-xl bg-red-600/40 animate-pulse" />
              <div className="h-12 w-12 rounded-xl bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Bottom Thumbnails Strip Skeleton (Desktop Only) */}
        <div className="hidden lg:flex absolute bottom-6 left-12 z-20 items-center gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 w-32 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
