'use client';

import React, { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';

const AlexPlayer = dynamic(() => import('./AlexPlayer'), { ssr: false });
const AlexPlayerMobile = dynamic(() => import('./AlexPlayerMobile'), { ssr: false });

type PlayerWrapperProps = React.ComponentProps<typeof AlexPlayer>;

let cachedMobileClassification: boolean | null = null;

const subscribeToDeviceClassification = () => () => {};
const getServerDeviceClassification = () => null;
const getClientDeviceClassification = () => {
  if (cachedMobileClassification === null) {
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    cachedMobileClassification = (isMobileUA || isTouch || hasCoarsePointer) && window.innerWidth < 1024;
  }
  return cachedMobileClassification;
};

export default function PlayerWrapper(props: PlayerWrapperProps) {
  // Keep the classification stable for the page lifetime. Swapping player
  // implementations during rotation/resizing would destroy playback state.
  const isMobile = useSyncExternalStore(
    subscribeToDeviceClassification,
    getClientDeviceClassification,
    getServerDeviceClassification,
  );

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
