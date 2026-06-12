import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col relative pt-24 animate-fade-in-up overflow-x-hidden">
      {/* Skeleton Background Glow */}
      <div className="fixed inset-0 z-[-1] opacity-20 blur-[60px] bg-gradient-to-tr from-[#0a0e17] via-[#16203a] to-[#0a0e17] animate-pulse"></div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full z-10 flex-grow">
        {/* Skeleton Layout matching WatchContainer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          
          {/* Main Video Section Skeleton */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="w-full aspect-video bg-white/5 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shine"></div>
              {/* Center Spinner */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white/10 border-t-alex-primary rounded-full animate-spin shadow-[0_0_15px_rgba(229,9,20,0.5)]"></div>
              </div>
            </div>

            {/* Title & Info Skeleton */}
            <div className="ios-glass p-6 sm:p-8 rounded-3xl relative overflow-hidden">
              <div className="h-8 bg-white/10 rounded-lg w-2/3 mb-4 animate-pulse"></div>
              <div className="flex gap-3 mb-6">
                <div className="h-6 bg-white/10 rounded-full w-20 animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded-full w-16 animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded-full w-24 animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-white/5 rounded w-11/12 animate-pulse"></div>
                <div className="h-4 bg-white/5 rounded w-4/5 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Sidebar / Episodes Skeleton */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="ios-glass p-6 rounded-3xl min-h-[500px]">
              <div className="h-6 bg-white/10 rounded w-1/3 mb-6 animate-pulse"></div>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-24 h-16 bg-white/10 rounded-xl flex-shrink-0 animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-full animate-pulse"></div>
                      <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
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
