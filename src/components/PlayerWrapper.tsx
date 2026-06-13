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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Check immediately on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Avoid hydration mismatch by waiting for mount
  if (isMobile === null) {
    return <div className="w-full h-full bg-black"></div>; // Placeholder
  }

  return isMobile ? <AlexPlayerMobile {...props} /> : <AlexPlayer {...props} />;
}
