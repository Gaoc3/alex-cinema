import React from 'react';
import HeroSkeleton from '@/components/skeleton/HeroSkeleton';
import SliderSkeleton from '@/components/skeleton/SliderSkeleton';

export default function HomeLoading() {
  return (
    <div className="animate-fade-in-up pb-20 overflow-hidden">
      {/* Hero Section Skeleton */}
      <div className="-mt-16 sm:-mt-20 lg:mt-0 relative z-0">
        <HeroSkeleton />
      </div>

      {/* Row Sliders Skeletons */}
      <div className="mt-4 sm:mt-6 space-y-6">
        <SliderSkeleton />
        <SliderSkeleton />
        <SliderSkeleton />
      </div>
    </div>
  );
}
