'use client';

import React from 'react';
import CardSkeleton from './CardSkeleton';

export default function GridSkeleton({ count = 20 }: { count?: number }) {
  const items = Array.from({ length: count });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4 sm:gap-6" dir="rtl">
      {items.map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
