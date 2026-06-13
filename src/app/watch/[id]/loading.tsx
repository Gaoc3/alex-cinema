import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col relative pt-24 animate-fade-in-up overflow-x-hidden">
      {/* Skeleton Background Glow */}
      <div className="fixed inset-0 z-[-1] opacity-20 blur-[60px] bg-gradient-to-tr from-[#0a0e17] via-[#16203a] to-[#0a0e17] animate-pulse"></div>

      <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 py-10 flex-grow">
        
        {/* Row 1: Player & Poster */}
        <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
          <div className="col-span-12 lg:col-span-9 flex flex-col justify-stretch">
            {/* Player Skeleton */}
            <div className="w-full aspect-video bg-white/5 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shine"></div>
              {/* Center Spinner */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white/10 border-t-alex-primary rounded-full animate-spin shadow-[0_0_15px_rgba(229,9,20,0.5)]"></div>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-3 flex flex-col">
            {/* Poster Skeleton */}
            <div className="glass-panel rounded-3xl p-5 shadow-2xl relative overflow-hidden border border-white/5 flex flex-col h-full min-h-[350px]">
              <div className="relative flex-1 rounded-2xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-white/10 bg-white/5 animate-pulse">
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shine"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Details & Additional Info */}
        <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
          <div className="col-span-12 lg:col-span-9 flex flex-col">
            {/* Details Skeleton */}
            <div className="ios-glass p-6 sm:p-8 rounded-3xl relative overflow-hidden h-full">
              <div className="h-8 bg-white/10 rounded-lg w-2/3 mb-4 animate-pulse"></div>
              <div className="flex gap-3 mb-6">
                <div className="h-6 bg-white/10 rounded-full w-20 animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded-full w-16 animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded-full w-24 animate-pulse"></div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-white/5 rounded w-11/12 animate-pulse"></div>
                <div className="h-4 bg-white/5 rounded w-4/5 animate-pulse"></div>
              </div>
              {/* Action Toolbar Skeleton */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                 <div className="h-12 bg-white/10 rounded-xl w-32 animate-pulse"></div>
                 <div className="h-12 bg-white/10 rounded-xl w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-3 flex flex-col">
            {/* Additional Info Skeleton */}
             <div className="ios-glass p-6 rounded-3xl relative overflow-hidden flex flex-col gap-4 h-full">
                 <div className="h-6 bg-white/10 rounded-lg w-1/2 mb-4 animate-pulse"></div>
                 <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                 <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse"></div>
                 <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse"></div>
                 <div className="h-4 bg-white/5 rounded w-2/3 animate-pulse"></div>
             </div>
          </div>
        </div>

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
