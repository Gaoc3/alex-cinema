import React from 'react';
import HeroSkeleton from '@/components/skeleton/HeroSkeleton';
import SliderSkeleton from '@/components/skeleton/SliderSkeleton';

export default function HomeLoading() {
  return (
    <div className="animate-fade-in-up pb-20 w-full min-h-[100svh] overflow-x-hidden bg-[#070a11]">
      {/* Edge-to-Edge Full-Width Hero Section Skeleton */}
      <div className="-mt-16 sm:-mt-20 lg:mt-0 relative z-0 w-full">
        <HeroSkeleton />
      </div>

      {/* Row Sliders Skeletons */}
      <div className="mt-8 space-y-8 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <SliderSkeleton />
        <SliderSkeleton />
        <SliderSkeleton />
      </div>
    </div>
  );
}
