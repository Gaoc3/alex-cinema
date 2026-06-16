import React from 'react';
import GridSkeleton from '@/components/skeleton/GridSkeleton';

export default function CategoryLoading() {
  return (
    <div className="min-h-screen pt-32 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      
      {/* Title Skeleton */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-1.5 h-8 bg-white/10 rounded-full animate-pulse shadow-inner"></div>
        <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse"></div>
      </div>

      {/* Grid Content Skeleton */}
      <div className="py-2 w-full">
        <GridSkeleton count={24} />
      </div>

    </div>
  );
}
