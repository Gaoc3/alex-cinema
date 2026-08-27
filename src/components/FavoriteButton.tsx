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

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={active ? `إزالة ${title} من المفضلة` : `إضافة ${title} إلى المفضلة`}
      title={active ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      className={`absolute top-3 left-3 size-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.5)] backdrop-blur-md border ${
        active 
          ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30" 
          : "bg-black/40 border-white/15 hover:bg-black/60 hover:border-white/30"
      } group z-20 overflow-hidden cursor-pointer select-none active:scale-90 ${className}`}
    >
      <i 
        className={`fa-solid fa-heart transition-all duration-300 ${
          active 
            ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.85)] scale-110" 
            : "text-white/70 group-hover:text-white group-hover:scale-110"
        }`}
      />
      
      {/* Click feedback animation */}
      <span className={`absolute inset-0 rounded-full bg-red-500/40 scale-0 ${isSubmitting ? 'animate-ping' : ''}`} />
    </button>
  );
}
