'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AlexPlayer = dynamic(() => import('./AlexPlayer'), { ssr: false });
const AlexPlayerMobile = dynamic(() => import('./AlexPlayerMobile'), { ssr: false });

interface PlayerWrapperProps {
  videoData: any;
  onNextEpisode?: () => void;
  roomHook?: any;
}

export default function PlayerWrapper(props: PlayerWrapperProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Pick one implementation for the lifetime of this mount. Switching player
    // components during a resize/orientation change destroys playback state.
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    setIsMobile((isMobileUA || isTouch || hasCoarsePointer) && window.innerWidth < 1024);
  }, []);

  if (isMobile === null) {
    // FIXED: Pulse Skeleton matching exactly the player's shape to prevent CLS
    return (
      <div className="w-full aspect-video bg-[#0a0a0f] animate-pulse rounded-3xl border border-white/5 flex items-center justify-center shadow-2xl relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
         <i className="fa-solid fa-circle-notch fa-spin text-4xl text-alex-primary/30"></i>
      </div>
    ); 
  }

  return isMobile ? <AlexPlayerMobile {...props} /> : <AlexPlayer {...props} />;
}
