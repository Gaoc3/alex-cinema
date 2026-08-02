import React from 'react';

export default function RoomLoading() {
  return (
    <div className="flex h-screen w-full bg-[#070a11] text-white overflow-hidden" dir="rtl">
      {/* Player Section Skeleton */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4 lg:p-6 space-y-4">
        {/* Main Player Box Skeleton */}
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c1019] shadow-2xl animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-16 rounded-full border-4 border-white/10 border-t-red-600 animate-spin" />
          </div>
        </div>

        {/* Action Bar Skeleton below player */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#0c1019] p-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg bg-white/10" />
            <div className="h-4 w-32 rounded bg-white/5" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 rounded-xl bg-white/10" />
            <div className="h-10 w-28 rounded-xl bg-red-600/40" />
          </div>
        </div>
      </div>

      {/* Sidebar Chat & Members Panel Skeleton (Desktop Only) */}
      <div className="hidden lg:flex w-80 flex-col border-l border-white/[0.08] bg-[#090d16] p-4 space-y-4 animate-pulse">
        <div className="h-12 w-full rounded-xl bg-white/10" />
        <div className="flex-1 space-y-3 pt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
              <div className="size-9 rounded-full bg-white/10" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-24 rounded bg-white/10" />
                <div className="h-3 w-16 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-12 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  );
}
