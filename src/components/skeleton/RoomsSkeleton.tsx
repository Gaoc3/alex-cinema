import React from 'react';

export default function RoomsSkeleton() {
  return (
    <div className="min-h-screen bg-[#070a11] px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-6">
          <div className="space-y-2">
            <div className="h-9 w-64 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-4 w-96 rounded-lg bg-white/5 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-32 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-11 w-36 rounded-xl bg-red-600/40 animate-pulse" />
          </div>
        </div>

        {/* Room Cards Grid Skeleton matching RoomsListClient.tsx */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="relative min-h-[240px] flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c1019] p-5 shadow-xl animate-pulse"
            >
              {/* Shimmer Backdrop */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0c1019] via-white/[0.03] to-[#0c1019]" />

              {/* Top Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="h-6 w-20 rounded-full bg-white/10" />
                <div className="h-6 w-16 rounded-full bg-white/10" />
              </div>

              {/* Bottom Info */}
              <div className="relative z-10 space-y-3 pt-8">
                <div className="h-6 w-3/4 rounded-lg bg-white/10" />
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-white/10" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-24 rounded bg-white/10" />
                    <div className="h-3 w-16 rounded bg-white/5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
