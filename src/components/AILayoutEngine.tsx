'use client';

import { useEffect } from 'react';

/**
 * Global AI Layout Engine
 * Calculates pixel-perfect viewport dimensions to overcome 100vh bugs on iOS/mobile browsers.
 * Injects CSS variables globally for Tailwind to consume.
 */
export default function AILayoutEngine() {
  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      // Calculate perfect sub-pixel values for 1vh and 1vw
      const vh = window.innerHeight * 0.01;
      const vw = window.innerWidth * 0.01;
      
      // Determine device conditions intelligently
      const isShort = window.innerHeight < 750 ? 1 : 0;
      const isMobile = window.innerWidth < 768 ? 1 : 0;

      // Inject into the CSS root variables for global consumption
      document.documentElement.style.setProperty('--ai-vh', `${vh}px`);
      document.documentElement.style.setProperty('--ai-vw', `${vw}px`);
      document.documentElement.style.setProperty('--ai-short', `${isShort}`);
      document.documentElement.style.setProperty('--ai-mobile', `${isMobile}`);
    };

    // Initial injection
    updateLayout();

    // Listen to changes continuously
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  return null; // Invisible brain component
}
