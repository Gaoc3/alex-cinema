'use client';

import React from 'react';
import CardSkeleton from './CardSkeleton';

export default function GridSkeleton({ count = 24 }: { count?: number }) {
  // Render a fixed number of items. CSS Grid will automatically wrap them.
  // We use 24 as it cleanly divides into 2, 3, 4, 6 columns and fills most screens without needing JS calculation.
  const items = Array.from({ length: count });
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-12 overflow-hidden">
      {items.map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
