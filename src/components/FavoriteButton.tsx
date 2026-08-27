"use client";

import React, { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteButtonProps {
  mediaId: string | number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  className?: string;
}

export default function FavoriteButton({ 
  mediaId, 
  mediaType, 
  title, 
  posterPath,
  className = ""
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const active = isFavorite(mediaId, mediaType);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await toggleFavorite({
        mediaId,
        mediaType,
        title,
        posterPath,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasCustomPosition = className.includes('relative') || className.includes('absolute') || className.includes('static');
  const basePosition = hasCustomPosition ? '' : 'absolute top-3 left-3';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={active ? `إزالة ${title} من المفضلة` : `إضافة ${title} إلى المفضلة`}
      title={active ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      className={`${basePosition} size-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.6)] backdrop-blur-md border ${
        active 
          ? "bg-red-600/30 border-red-500/60 hover:bg-red-600/50 hover:border-red-500 shadow-[0_0_15px_rgba(229,9,20,0.4)]" 
          : "bg-black/60 border-white/20 hover:bg-black/80 hover:border-white/40"
      } group z-20 overflow-hidden cursor-pointer select-none active:scale-90 ${className}`}
    >
      <i 
        className={`fa-solid fa-heart text-xs transition-all duration-300 ${
          active 
            ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] scale-110" 
            : "text-slate-300 group-hover:text-white group-hover:scale-110"
        }`}
      />
      
      {/* Click feedback animation */}
      <span className={`absolute inset-0 rounded-full bg-red-500/40 scale-0 ${isSubmitting ? 'animate-ping' : ''}`} />
    </button>
  );
}
