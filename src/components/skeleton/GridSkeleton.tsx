import React from 'react';
import CardSkeleton from './CardSkeleton';

export default function GridSkeleton({ count = 12 }: { count?: number }) {
  const items = Array.from({ length: count });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-12">
      {items.map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
