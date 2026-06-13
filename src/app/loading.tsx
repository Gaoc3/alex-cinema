import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="animate-fade-in-up pb-20 w-full overflow-hidden">
      {/* Skeleton Background Glow */}
      <div className="fixed inset-0 z-[-1] opacity-10 blur-[80px] bg-gradient-to-tr from-[#0a0e17] via-[#e50914] to-[#0a0e17] animate-pulse pointer-events-none"></div>

      {/* Hero Section Skeleton */}
      <div className="-mt-16 sm:-mt-20 lg:mt-0 relative z-0">
        <div className="w-full h-[60vh] sm:h-[70vh] lg:h-[85vh] bg-white/5 relative overflow-hidden animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shine"></div>
          
          {/* Hero Content Overlay Skeleton */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-[#070a13]/60 to-transparent flex flex-col justify-end px-4 sm:px-8 lg:px-16 pb-12 sm:pb-20 lg:pb-28">
            <div className="max-w-4xl">
              <div className="h-6 bg-white/10 rounded-full w-32 mb-4 animate-pulse"></div>
              <div className="h-12 sm:h-16 lg:h-20 bg-white/10 rounded-xl w-3/4 mb-4 animate-pulse"></div>
              <div className="flex gap-4 mb-6">
                <div className="h-6 bg-white/10 rounded-full w-20 animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded-full w-24 animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded-full w-16 animate-pulse"></div>
              </div>
              <div className="space-y-3 mb-8">
                <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-white/5 rounded w-11/12 animate-pulse"></div>
                <div className="h-4 bg-white/5 rounded w-4/5 animate-pulse"></div>
              </div>
              <div className="flex gap-4">
                <div className="h-14 bg-white/10 rounded-xl w-40 animate-pulse"></div>
                <div className="h-14 bg-white/5 rounded-xl w-14 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row Sliders Skeletons */}
      <div className="mt-8 sm:mt-12 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {[...Array(3)].map((_, rowIndex) => (
          <div key={rowIndex} className="space-y-6">
            {/* Row Title Skeleton */}
            <div className="flex flex-col gap-2">
              <div className="h-8 bg-white/10 rounded-lg w-48 animate-pulse"></div>
              <div className="h-4 bg-white/5 rounded w-72 animate-pulse"></div>
            </div>

            {/* Row Cards Skeleton */}
            <div className="flex gap-4 sm:gap-6 overflow-hidden">
              {[...Array(6)].map((_, cardIndex) => (
                <div key={cardIndex} className="w-[140px] sm:w-[180px] md:w-[220px] lg:w-[260px] flex-shrink-0 flex flex-col gap-3">
                  <div className="w-full aspect-[2/3] bg-white/5 rounded-2xl relative overflow-hidden animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shine"></div>
                  </div>
                  <div className="h-5 bg-white/10 rounded w-full animate-pulse"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-white/5 rounded w-1/3 animate-pulse"></div>
                    <div className="h-4 bg-white/5 rounded w-1/4 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Shine Animation Styles */}
      <style>{`
        @keyframes skeleton-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-shine {
          animation: skeleton-shine 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
