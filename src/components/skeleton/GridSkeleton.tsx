'use client';

import React, { useState, useEffect } from 'react';
import CardSkeleton from './CardSkeleton';

export default function GridSkeleton({ count = 12 }: { count?: number }) {
  const [smartCount, setSmartCount] = useState(count);

  useEffect(() => {
    // 🧠 Smart AI Engine for Ghost Calculation
    // Calculates exactly how many skeletons are needed to perfectly fill the user's screen
    const calculateSmartCount = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 1. Determine columns based on current Tailwind breakpoints
      let cols = 2;
      if (width >= 1536) cols = 6;
      else if (width >= 1280) cols = 5;
      else if (width >= 768) cols = 4;
      else if (width >= 640) cols = 3;

      // 2. Estimate container width (subtracting approximate padding)
      const containerWidth = Math.min(width, 1536) - 32;
      const totalGapWidth = (cols - 1) * 20; // gap-x-5 is 20px
      const cardWidth = Math.max(0, (containerWidth - totalGapWidth) / cols);

      // 3. Calculate exact Card Height (Aspect ratio 2/3 + 60px info block)
      const cardHeight = (cardWidth * 1.5) + 60;
      const totalRowHeight = cardHeight + 48; // adding gap-y-12 (48px)

      // 4. Calculate rows needed to fill the screen (+1 row for safety so it extends below the fold)
      const visibleRows = Math.ceil(height / totalRowHeight) + 1;

      // 5. Final calculation with sensible limits
      let exactCount = visibleRows * cols;
      exactCount = Math.max(exactCount, cols * 2); // Absolute minimum is 2 rows
      exactCount = Math.min(exactCount, 40); // Cap at 40 so we don't crash mobile devices

      setSmartCount(exactCount);
    };

    // Run initially
    calculateSmartCount();

    // Re-run if user resizes the window or rotates device!
    window.addEventListener('resize', calculateSmartCount);
    return () => window.removeEventListener('resize', calculateSmartCount);
  }, []);

  const items = Array.from({ length: smartCount });
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-12">
      {items.map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
