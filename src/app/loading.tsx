import React from 'react';
import HeroSkeleton from '@/components/skeleton/HeroSkeleton';
import SliderSkeleton from '@/components/skeleton/SliderSkeleton';

export default function GlobalLoading() {
  return (
    <div className="animate-fade-in-up pb-20 overflow-hidden w-full bg-[#070a11]">
      {/* Hero Section Skeleton */}
      <div className="relative z-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <HeroSkeleton />
      </div>

      {/* Row Sliders Skeletons */}
      <div className="mt-8 space-y-8 max-w-7xl mx-auto">
        <SliderSkeleton />
        <SliderSkeleton />
        <SliderSkeleton />
      </div>
    </div>
  );
}
