import React from 'react';

/**
 * HeroSkeleton — mirrors HeroCarousel.tsx 1:1
 *
 * KEY fixes vs. previous version:
 *  - NO min-h on content card (was forcing 340px → overflow on most screens)
 *  - paddingBottom: 200px (matches actual thumbnail strip height ~184px + 16px margin)
 *  - Background: relative lg:absolute inset-0 (same as HeroCarousel — bg is out of flow on desktop)
 *  - Content overlay drives parent height via lg:h-[85vh] lg:min-h-[600px]
 */
export default function HeroSkeleton() {
  return (
    <div className="w-full relative mt-0 bg-transparent flex flex-col lg:block">

      {/* ─── Background (absolute on desktop, fills parent height driven by content overlay) ─── */}
      <div className="relative lg:absolute inset-0 w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-full lg:min-h-[600px] overflow-hidden bg-[#0a0e18]">

        {/* Shimmer sweep */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        {/* Ambient blobs */}
        <div className="absolute top-0 left-1/2 size-[500px] -translate-x-1/2 rounded-full bg-red-800/10 blur-[160px] pointer-events-none" />

        {/* Gradients — matching HeroCarousel */}
        <div className="hidden lg:block absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#060811] to-transparent z-[2]" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[50%] bg-gradient-to-l from-[#060811]/60 to-transparent z-[2]" />
        <div className="hidden lg:block absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#060811]/20 to-transparent z-[2]" />
        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-[#060811]/60 via-transparent to-transparent z-[2]" />

        {/* Arrow ghosts */}
        <div className="hidden lg:flex absolute left-5 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/[0.07] border border-white/15 items-center justify-center">
          <div className="w-2.5 h-4 rounded-sm bg-white/30 animate-pulse" />
        </div>
        <div className="hidden lg:flex absolute right-5 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/[0.07] border border-white/15 items-center justify-center">
          <div className="w-2.5 h-4 rounded-sm bg-white/30 animate-pulse" />
        </div>
      </div>

      {/* ─── Content Overlay (desktop) — DRIVES PARENT HEIGHT ─────────────────────────────── */}
      {/*
        Matches HeroCarousel:
          hidden lg:flex relative z-30 w-full flex-col justify-end
          lg:h-[85vh] lg:min-h-[600px] lg:max-h-[700px] pt-32
          paddingBottom ≈ thumbnail_height(144px) + py-5(40px) + margin(16px) = 200px
      */}
      <div
        className="hidden lg:flex relative z-30 w-full flex-col justify-end lg:h-[85vh] lg:min-h-[600px] lg:max-h-[700px] pt-32 pointer-events-none"
        style={{ paddingBottom: '200px' }}
      >
        {/*
          Matches: max-w-screen-2xl mx-auto pl-16 w-full flex-col justify-end mb-6 mt-auto
          paddingRight ≈ arrow_width(56px) + 40px safe zone = ~100px (right arrow in RTL context)
        */}
        <div
          className="max-w-screen-2xl mx-auto pl-16 w-full flex flex-col justify-end mb-6 mt-auto"
          style={{ paddingRight: '100px' }}
        >
          {/*
            Content card — NO min-h (was causing overflow).
            Uses text-right + flex flex-col justify-end (same as HeroCarousel).
          */}
          <div className="max-w-3xl relative text-right flex flex-col justify-end">
            <div className="flex-grow flex flex-col justify-end gap-3">

              {/* Metadata: type · dot · year · dot · ★ · badge */}
              <div className="flex items-center gap-3">
                <div className="h-4 w-10 rounded bg-white/20 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
                <div className="h-4 w-12 rounded bg-white/20 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-yellow-400/40 animate-pulse" />
                  <div className="h-4 w-10 rounded bg-yellow-400/25 animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded bg-red-600/60 animate-pulse" />
              </div>

              {/* Arabic title — large (h1 equivalent) */}
              <div className="h-12 w-72 rounded-lg bg-white/20 animate-pulse" />

              {/* English title — small (h2 equivalent) */}
              <div className="h-4 w-44 rounded bg-white/14 animate-pulse" />

              {/* Description — 3 lines */}
              <div className="space-y-2">
                <div className="h-3.5 w-80 rounded bg-white/10 animate-pulse" />
                <div className="h-3.5 w-64 rounded bg-white/10 animate-pulse" />
                <div className="h-3.5 w-48 rounded bg-white/10 animate-pulse" />
              </div>
            </div>

            {/* Buttons row — white solid + glass (matching HeroCarousel) */}
            <div className="flex items-center gap-4 mt-5">
              {/* "شاهد الآن" — white solid */}
              <div className="h-11 w-32 rounded-md bg-white/30 animate-pulse" />
              {/* "الإعلان الترويجي" — glass */}
              <div className="h-11 w-44 rounded-md bg-white/12 border border-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Thumbnail Strip ──────────────────────────────────────────────────────────────── */}
      {/*
        Matches HeroCarousel thumbnail wrapper:
          "w-full z-20 relative mt-4 lg:mt-0 lg:absolute lg:bottom-0"
        Desktop inner row:
          "hidden lg:flex gap-4 overflow-x-auto hide-scrollbar w-full px-8 py-5 items-end"
        Active  → lg:w-64  aspect-[16/9]  border-red-500 ring-2
        Passive → lg:w-48  aspect-[16/9]  border-white/10 opacity-70
      */}
      <div className="w-full z-20 relative mt-4 lg:mt-0 lg:absolute lg:bottom-0 pointer-events-none">
        {/* Dark backdrop */}
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#060811]/95 via-[#060811]/50 to-transparent -z-10" />

        {/* Mobile dots */}
        <div className="flex lg:hidden justify-center items-center gap-2 pb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`rounded-full bg-white/25 animate-pulse ${i === 0 ? 'w-2.5 h-2.5' : 'w-2 h-2'}`} />
          ))}
        </div>

        {/* Desktop thumbnails */}
        <div className="hidden lg:flex gap-4 overflow-x-hidden w-full px-8 py-5 items-end">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={[
                'relative aspect-[16/9] rounded-xl overflow-hidden flex-shrink-0 border animate-pulse',
                i === 0
                  ? 'lg:w-64 border-red-500/70 ring-2 ring-red-500/30 shadow-[0_8px_25px_rgba(229,9,20,0.25)] bg-white/10'
                  : 'lg:w-48 border-white/12 opacity-65 bg-white/[0.06]',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
