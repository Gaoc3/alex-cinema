import React from 'react';

/**
 * HeroSkeleton — mirrors HeroCarousel.tsx structure 1:1
 *
 * KEY structural rules (must match HeroCarousel exactly):
 *  - NO dir="rtl" on outer wrapper (HeroCarousel is LTR layout, content on LEFT)
 *  - Background div: "relative lg:absolute inset-0" (absolute on desktop, out of flow)
 *  - Height driver on desktop: the content overlay div (hidden lg:flex ... lg:h-[85vh])
 *  - Thumbnail strip: absolute bottom-0, full-width horizontal scroll
 */
export default function HeroSkeleton() {
  return (
    <div className="w-full relative mt-0 bg-transparent flex flex-col lg:block">

      {/* ── Background Container ─────────────────────────────────────────
          Matches: "relative lg:absolute inset-0 w-full aspect-[16/9]
                    sm:aspect-[21/9] lg:aspect-auto lg:h-full lg:min-h-[600px]"
          On desktop → absolute, fills parent height driven by content overlay
          On mobile  → relative with aspect ratio
      ────────────────────────────────────────────────────────────────── */}
      <div className="relative lg:absolute inset-0 w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-full lg:min-h-[600px] overflow-hidden bg-[#0c1119]">

        {/* Shimmer sweep — left to right */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        </div>

        {/* Ambient glow blobs */}
        <div className="absolute -top-24 left-1/3 size-96 rounded-full bg-red-700/15 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 size-80 rounded-full bg-blue-800/10 blur-[130px] pointer-events-none" />

        {/* Bottom gradient — matches HeroCarousel's "from-[#060811] to-transparent" */}
        <div className="hidden lg:block absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#060811] to-transparent z-[2]" />
        {/* Right vignette */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[50%] bg-gradient-to-l from-[#060811]/70 via-[#060811]/25 to-transparent z-[2]" />
        {/* Top micro-fade */}
        <div className="hidden lg:block absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#060811]/25 to-transparent z-[2]" />
        {/* Mobile bottom fade */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-[#060811]/60 via-transparent to-transparent z-[2]" />

        {/* Navigation arrow ghosts */}
        <div className="hidden lg:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/[0.08] border border-white/15 items-center justify-center">
          <div className="w-3 h-4 rounded-sm bg-white/30 animate-pulse" />
        </div>
        <div className="hidden lg:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/[0.08] border border-white/15 items-center justify-center">
          <div className="w-3 h-4 rounded-sm bg-white/30 animate-pulse" />
        </div>
      </div>

      {/* ── Content Overlay (Desktop only) ───────────────────────────────
          Matches HeroCarousel:
            "hidden lg:flex relative z-30 w-full flex-col justify-end
             lg:h-[85vh] lg:min-h-[600px] lg:max-h-[700px] pt-32"
          paddingBottom ≈ 250px (thumb strip height + margin)
          This div DRIVES the parent height on desktop (background is absolute)
      ─────────────────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex relative z-30 w-full flex-col justify-end lg:h-[85vh] lg:min-h-[600px] lg:max-h-[700px] pt-32 pointer-events-none"
        style={{ paddingBottom: '250px' }}
      >
        {/* Inner wrapper — matches "max-w-screen-2xl mx-auto pl-16 w-full ... mb-6 mt-auto"
            paddingRight ≈ 168px (right arrow + safe margin) */}
        <div
          className="max-w-screen-2xl mx-auto pl-16 w-full flex flex-col justify-end mb-6 mt-auto"
          style={{ paddingRight: '168px' }}
        >
          {/* Content card — matches "max-w-3xl relative text-right flex flex-col justify-end
              min-h-[260px] sm:min-h-[300px] lg:min-h-[340px]" */}
          <div className="max-w-3xl relative text-right flex flex-col justify-end min-h-[260px] sm:min-h-[300px] lg:min-h-[340px]">
            <div className="flex-grow flex flex-col justify-end space-y-3">

              {/* Metadata row: type · dot · year · dot · ★ rating · "حصرياً" badge */}
              <div className="flex items-center gap-3 mb-1">
                <div className="h-4 w-10 rounded bg-white/20 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
                <div className="h-4 w-12 rounded bg-white/20 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
                <div className="h-4 w-14 rounded bg-yellow-400/25 animate-pulse" />
                <div className="h-5 w-14 rounded bg-red-600/60 animate-pulse" />
              </div>

              {/* Arabic title (h1) */}
              <div className="h-14 w-[22rem] rounded-lg bg-white/20 animate-pulse" />

              {/* English title (h2) */}
              <div className="h-4 w-48 rounded bg-white/15 animate-pulse" />

              {/* Description — 3 lines */}
              <div className="space-y-2 pt-1">
                <div className="h-4 w-[26rem] rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-[22rem] rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-[16rem] rounded bg-white/10 animate-pulse" />
              </div>
            </div>

            {/* Buttons row — matches "flex flex-wrap items-center justify-start gap-4 mt-auto"
                Button 1: white solid  → "bg-white text-black rounded-md px-8 py-3"
                Button 2: glass/blur  → "bg-white/20 backdrop-blur rounded-md px-8 py-3"  */}
            <div className="flex items-center gap-4 mt-6">
              {/* White "شاهد الآن" */}
              <div className="h-12 w-36 rounded-md bg-white/35 animate-pulse" />
              {/* Glass "الإعلان الترويجي" */}
              <div className="h-12 w-48 rounded-md bg-white/15 border border-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Thumbnail Strip ───────────────────────────────────────────────
          Matches HeroCarousel:
            "w-full z-20 relative mt-4 lg:mt-0 lg:absolute lg:bottom-0"
          Inner desktop row:
            "hidden lg:flex gap-4 overflow-x-auto hide-scrollbar w-full px-8 py-5 items-end"
          Active thumb  → lg:w-64  aspect-[16/9]  border-alex-primary ring-2
          Inactive thumb → lg:w-48  opacity-85     border-white/10
      ─────────────────────────────────────────────────────────────────── */}
      <div className="w-full z-20 relative mt-4 lg:mt-0 lg:absolute lg:bottom-0 pointer-events-none">
        {/* Dark backdrop behind thumbnails */}
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#060811]/95 via-[#060811]/60 to-transparent -z-10" />

        {/* Mobile: dot indicators */}
        <div className="flex lg:hidden justify-center items-center gap-2 pb-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`rounded-full bg-white/25 animate-pulse ${i === 0 ? 'w-2.5 h-2.5' : 'w-2 h-2'}`}
            />
          ))}
        </div>

        {/* Desktop: thumbnail cards */}
        <div className="hidden lg:flex gap-4 overflow-x-hidden w-full px-8 py-5 items-end">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={[
                'relative aspect-[16/9] rounded-xl overflow-hidden flex-shrink-0 border animate-pulse',
                i === 0
                  ? 'lg:w-64 border-red-500/70 ring-2 ring-red-500/40 shadow-[0_10px_30px_rgba(229,9,20,0.3)] bg-white/[0.12]'
                  : 'lg:w-48 border-white/15 opacity-70 bg-white/[0.07]',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
