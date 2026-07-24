"use client";

import { useState, useTransition } from "react";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import { useAuth } from "@clerk/nextjs";

interface FavoriteButtonProps {
  mediaId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  initialIsFavorite?: boolean;
}

export default function FavoriteButton({ 
  mediaId, 
  mediaType, 
  title, 
  posterPath, 
  initialIsFavorite = false 
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, startTransition] = useTransition();
  const { isSignedIn, isLoaded, user } = useUnifiedAuth();
  const { getToken } = useAuth();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoaded || (!isSignedIn && !user)) {
      alert("يجب تسجيل الدخول لإضافة المفضلات");
      return;
    }

    // Optimistic update
    startTransition(() => {
      setIsFavorite(!isFavorite);
    });

    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mediaId, mediaType, title, posterPath })
      });

      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setIsFavorite(isFavorite);
        console.error(data.error);
      } else {
        // Ensure state matches server
        setIsFavorite(data.action === 'added');
      }
    } catch (err) {
      console.error(err);
      // Revert on failure
      setIsFavorite(isFavorite);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isPending}
      className={`absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.5)] backdrop-blur-md border ${
        isFavorite 
          ? "bg-pink-500/20 border-pink-500/50 hover:bg-pink-500/30" 
          : "bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/30"
      } group z-20 overflow-hidden`}
      title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
    >
      <i 
        className={`fa-solid fa-heart transition-all duration-300 ${
          isFavorite 
            ? "text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] scale-110" 
            : "text-white/70 group-hover:text-white group-hover:scale-110"
        }`}
      ></i>
      
      {/* Click ripple effect */}
      <span className={`absolute inset-0 rounded-full bg-pink-500/40 scale-0 ${isPending ? 'animate-ping' : ''}`}></span>
    </button>
  );
}
