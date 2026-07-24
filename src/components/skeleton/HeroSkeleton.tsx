import React from 'react';

export default function HeroSkeleton() {
  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] min-h-[500px] overflow-hidden bg-[#090A0F]">
      {/* Background Skeleton */}
      <div className="absolute inset-0 bg-[#141722]/30 animate-pulse"></div>

      {/* Content Overlay Skeleton */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/80 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#090A0F] via-[#090A0F]/50 to-transparent" dir="rtl"></div>

      {/* Text Content Skeleton */}
      <div className="absolute inset-0 flex items-center pt-20" dir="rtl">
        <div className="px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl space-y-6">
            
            {/* Logo/Title Skeleton */}
            <div className="h-16 sm:h-24 lg:h-32 w-3/4 bg-[#141722] border border-white/[0.05] rounded-2xl animate-pulse"></div>

            {/* Meta Tags Skeleton */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-6 w-20 bg-[#141722] border border-white/[0.05] rounded-md animate-pulse"></div>
              <div className="h-6 w-24 bg-[#141722] border border-white/[0.05] rounded-md animate-pulse"></div>
              <div className="h-6 w-16 bg-[#141722] border border-white/[0.05] rounded-md animate-pulse"></div>
              <div className="h-6 w-12 bg-[#141722] border border-white/[0.05] rounded-md animate-pulse"></div>
            </div>

            {/* Description Skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-full bg-[#141722]/50 rounded-md animate-pulse"></div>
              <div className="h-4 w-11/12 bg-[#141722]/50 rounded-md animate-pulse"></div>
              <div className="h-4 w-4/5 bg-[#141722]/50 rounded-md animate-pulse"></div>
            </div>

            {/* Buttons Skeleton */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="h-12 sm:h-14 w-32 sm:w-40 bg-[#141722] border border-white/[0.05] rounded-2xl animate-pulse"></div>
              <div className="h-12 sm:h-14 w-32 sm:w-40 bg-[#141722] border border-white/[0.05] rounded-2xl animate-pulse"></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
