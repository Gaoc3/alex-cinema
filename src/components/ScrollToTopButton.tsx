'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  // Hide on video room or watch player pages to avoid UI clutter
  const isVideoPage = pathname?.startsWith('/room/') || pathname?.startsWith('/tg-app');

  useEffect(() => {
    if (isVideoPage) return;

    const toggleVisibility = () => {
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [isVideoPage]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (isVideoPage || !isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="العودة لأعلى الصفحة"
      title="العودة لأعلى الصفحة"
      className="fixed bottom-6 left-6 z-40 size-11 rounded-2xl bg-[#080d1a]/90 hover:bg-red-600 text-slate-300 hover:text-white border border-white/15 hover:border-red-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_25px_rgba(229,9,20,0.35)] backdrop-blur-xl flex items-center justify-center transition-all duration-300 active:scale-90 animate-fade-in cursor-pointer group"
    >
      <i className="fa-solid fa-arrow-up text-sm transform group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
