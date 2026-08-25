'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { getVideoImageCandidates } from '@/utils/imageHelper';

interface MediaPosterImageProps {
  video?: {
    img?: string;
    imgObjUrl?: string;
    imgMediumThumb?: string;
    imgThumb?: string;
    ar_title?: string;
    en_title?: string;
  } | null;
  src?: string;
  alt?: string;
  type?: 'poster' | 'cover' | 'backdrop';
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}

export default function MediaPosterImage({
  video,
  src,
  alt,
  type = 'poster',
  fill = true,
  className = '',
  sizes,
  priority = false,
  loading,
}: MediaPosterImageProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const title = video?.ar_title || video?.en_title || alt || 'ملصق المحتوى';

  const candidates = useMemo(() => {
    if (src) return [src];
    if (!video) return [];
    return getVideoImageCandidates(video, type);
  }, [video, src, type]);

  const fallbackUrl = useMemo(() => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(title || '?')}&background=0d1424&color=e50914&size=512`;
  }, [title]);

  const currentSrc = candidates[candidateIndex] || fallbackUrl;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Shimmer Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800/60 animate-pulse z-0 flex items-center justify-center">
          <i className="fa-solid fa-film text-white/10 text-2xl"></i>
        </div>
      )}

      <Image
        src={currentSrc}
        alt={title}
        fill={fill}
        priority={priority}
        loading={loading}
        unoptimized
        sizes={sizes || '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw'}
        className={`object-cover w-full h-full transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (candidateIndex < candidates.length) {
            setCandidateIndex((prev) => prev + 1);
          }
        }}
      />
    </div>
  );
}
