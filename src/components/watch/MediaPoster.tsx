'use client';

import { getImageUrl } from '@/utils/imageHelper';
import React, { useState } from 'react';
import Image from 'next/image';

interface MediaPosterProps {
  img: string;
  imdbUrlRef?: string;
}

export default function MediaPoster({ img, imdbUrlRef }: MediaPosterProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="glass-panel rounded-3xl p-5 shadow-2xl relative overflow-hidden border border-white/5 flex flex-col h-full group">
      
      <div className="relative flex-1 rounded-2xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-white/10 group min-h-[350px]">
        {/* Skeleton while loading */}
        {!isLoaded && (
          <>
            <div className="absolute inset-0 bg-white/5 animate-pulse overflow-hidden z-10 rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shine"></div>
            </div>
            <style>{`
              @keyframes skeleton-shine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              .skeleton-shine {
                animation: skeleton-shine 1.5s infinite;
              }
            `}</style>
          </>
        )}
        <Image 
          src={getImageUrl(img, 'poster')} 
          alt="Poster"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={true}
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-all duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent opacity-80"></div>
        
        {imdbUrlRef && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-sm border-t border-white/10 flex items-center justify-center rounded-b-2xl">
            <a 
              href={imdbUrlRef} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center justify-center gap-2.5 w-full bg-yellow-500 text-black py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-all hover-scale shadow-lg"
            >
              <i className="fa-brands fa-imdb text-xl"></i>
              <span>صفحة IMDB</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
