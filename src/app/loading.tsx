import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[80vh] flex flex-col relative animate-fade-in-up">
      {/* Skeleton Background Glow */}
      <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-alex-primary/10 via-background to-background animate-pulse pointer-events-none"></div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full z-10 flex-grow">
        
        {/* Header/Title Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 bg-white/10 rounded-lg w-48 animate-pulse"></div>
          <div className="h-6 bg-white/5 rounded-full w-24 animate-pulse hidden sm:block"></div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-6">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              {/* Poster Skeleton */}
              <div className="w-full aspect-[2/3] bg-white/5 rounded-xl border border-white/10 shadow-lg relative overflow-hidden animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skeleton-shine"></div>
                {/* Center subtle icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <i className="fa-solid fa-film text-3xl text-white"></i>
                </div>
              </div>
              
              {/* Text Skeletons */}
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          ))}
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
