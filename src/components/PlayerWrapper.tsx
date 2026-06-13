'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AlexPlayer = dynamic(() => import('./AlexPlayer'), { ssr: false });
const AlexPlayerMobile = dynamic(() => import('./AlexPlayerMobile'), { ssr: false });

interface PlayerWrapperProps {
  videoData: any;
  onNextEpisode?: () => void;
}

export default function PlayerWrapper(props: PlayerWrapperProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      // It's mobile if it has touch AND is relatively small, or if it has a mobile UA
      setIsMobile(isMobileUA || (isTouch && window.screen.width < 1024));
    };
    checkMobile(); // Check exactly once on mount
  }, []);

  // Avoid hydration mismatch by waiting for mount
  if (isMobile === null) {
    return <div className="w-full h-full bg-black"></div>; // Placeholder
  }

  return isMobile ? <AlexPlayerMobile {...props} /> : <AlexPlayer {...props} />;
}
