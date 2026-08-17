'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/utils/imageHelper';

interface TelegramMovieCardProps {
  item: {
    nb: string;
    ar_title: string;
    en_title?: string;
    year?: string;
    stars?: string;
    kind?: string;
    imgUrl?: string;
    img?: string;
    posterPath?: string;
  };
  onClick: () => void;
  size?: 'normal' | 'slider';
}

export default function TelegramMovieCard({ item, onClick, size = 'normal' }: TelegramMovieCardProps) {
  const rawImage = item.imgUrl || item.img || item.posterPath || '';
  const resolvedSrc = getImageUrl(rawImage, 'poster') || '/icon.svg';
  const [imgSrc, setImgSrc] = useState(resolvedSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const nextSrc = getImageUrl(item.imgUrl || item.img || item.posterPath || '', 'poster') || '/icon.svg';
    setImgSrc(nextSrc);
    setHasError(false);
  }, [item.imgUrl, item.img, item.posterPath]);

  const isSeries = item.kind === '2';

  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2 cursor-pointer group active:scale-95 transition-all ${
        size === 'slider' ? 'flex-shrink-0 w-40 xs:w-48 sm:w-56' : 'w-full'
      }`}
    >
      <div className="relative aspect-[2/3] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#131a2a] border border-white/15 shadow-lg group-hover:border-alex-primary/70 group-hover:shadow-[0_0_24px_rgba(229,9,20,0.45)] transition-all">
        <Image
          src={hasError ? '/icon.svg' : imgSrc}
          alt={item.ar_title || 'عمل فني'}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => {
            if (!hasError) {
              setHasError(true);
              setImgSrc('/icon.svg');
            }
          }}
          unoptimized
        />

        {/* Rating Badge */}
        {item.stars && item.stars !== '0' && (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-xs sm:text-sm font-black text-yellow-400 flex items-center gap-1 border border-yellow-500/40 shadow-md">
            <i className="fa-solid fa-star text-[11px] sm:text-xs"></i>
            <span>{item.stars}</span>
          </div>
        )}

        {/* Series Badge */}
        {isSeries && (
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-alex-primary backdrop-blur-md text-xs sm:text-sm font-black text-white shadow-md">
            مسلسل
          </div>
        )}
      </div>

      <p className="text-sm sm:text-base font-black text-gray-100 truncate group-hover:text-alex-primary transition-colors leading-snug">
        {item.ar_title || item.en_title || 'بدون عنوان'}
      </p>
      {item.year && <span className="text-xs sm:text-sm text-gray-400 font-bold -mt-1">{item.year}</span>}
    </div>
  );
}
