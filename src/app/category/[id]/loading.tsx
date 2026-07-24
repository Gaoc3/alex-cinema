import React from 'react';
import CardSkeleton from '@/components/skeleton/CardSkeleton';

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#070b14] pt-24 pb-12">
      <div className="w-full px-4 sm:px-6 md:px-8 xl:px-12 max-w-[2000px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-4">
            <div className="w-2 h-10 bg-alex-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(229,9,20,0.5)]"></div>
            <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse"></div>
          </h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-x-6 gap-y-12">
          {Array.from({ length: 30 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
