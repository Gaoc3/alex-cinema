'use client';

import { useEffect } from 'react';

/**
 * Global AI Layout Engine
 * Calculates pixel-perfect viewport dimensions to overcome 100vh bugs on iOS/mobile browsers.
 * Injects CSS variables globally for Tailwind to consume.
 */
export default function AILayoutEngine() {
  useEffect(() => {
    let ticking = false;

    const updateLayout = () => {
      // FIXED: Added requestAnimationFrame to prevent Layout Thrashing on mobile scroll
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (typeof window === 'undefined' || typeof document === 'undefined') return;

          const vh = window.innerHeight * 0.01;
          const vw = window.innerWidth * 0.01;
          
          const isShort = window.innerHeight < 750 ? 1 : 0;
          const isMobile = window.innerWidth < 768 ? 1 : 0;

          document.documentElement.style.setProperty('--ai-vh', `${vh}px`);
          document.documentElement.style.setProperty('--ai-vw', `${vw}px`);
          document.documentElement.style.setProperty('--ai-short', `${isShort}`);
          document.documentElement.style.setProperty('--ai-mobile', `${isMobile}`);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    updateLayout();

    window.addEventListener('resize', updateLayout, { passive: true });
    window.addEventListener('orientationchange', updateLayout, { passive: true });

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  return null; 
}