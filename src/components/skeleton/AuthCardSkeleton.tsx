import React from 'react';

interface AuthCardSkeletonProps {
  mode?: 'sign-in' | 'sign-up';
}

export default function AuthCardSkeleton({ mode = 'sign-in' }: AuthCardSkeletonProps) {
  return (
    <section
      className="relative min-w-0 w-full max-w-[29rem] px-px animate-fade-in-up"
      aria-label="جاري تحميل صفحة الدخول"
      dir="rtl"
    >
      {/* Outer Border Glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/20 via-white/[0.05] to-red-500/20" />
      
      {/* Main Glass Card Shell - Exact match with CustomAuthCard.tsx */}
      <div className="relative isolate rounded-[1.75rem] border border-white/20 bg-[#102139]/96 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-6 space-y-5 overflow-hidden">
        
        {/* Shimmer Pulse Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-pulse pointer-events-none" />

        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
          <div className="absolute -right-24 -top-24 size-64 rounded-full bg-red-600/15 blur-3xl animate-pulse" />
          <div className="absolute -bottom-28 -left-20 size-64 rounded-full bg-sky-500/10 blur-3xl animate-pulse" />
        </div>

        {/* 1. Header Title Skeleton */}
        <div className="space-y-2 text-right border-b border-white/10 pb-4">
          <div className="h-8 w-44 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-4 w-64 rounded-lg bg-white/5 animate-pulse" />
        </div>

        {/* 2. Quick Telegram Button Skeleton */}
        <div className="h-12 w-full rounded-2xl border border-sky-400/25 bg-sky-500/10 flex items-center justify-center gap-3 px-4 shadow-sm animate-pulse">
          <div className="size-7 rounded-xl bg-sky-400/20" />
          <div className="h-4 w-40 rounded-md bg-white/15" />
        </div>

        {/* 3. Divider Skeleton */}
        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-white/10" />
          <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* 4. Form Fields Skeleton */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3.5 w-28 rounded bg-white/10 animate-pulse" />
            <div className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          </div>
        </div>

        {/* 5. Submit Button Skeleton */}
        <div className="h-12 w-full rounded-2xl bg-red-600/40 border border-red-500/30 animate-pulse" />

        {/* 6. Footer Link Card Skeleton */}
        <div className="mt-4 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.065] p-3.5 animate-pulse">
          <div className="h-4 w-36 rounded bg-white/10" />
          <div className="h-9 w-28 rounded-xl bg-red-500/15 border border-red-400/20" />
        </div>

      </div>
    </section>
  );
}
