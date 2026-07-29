"use client";

import { useState } from "react";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import { useAuth } from "@clerk/nextjs";
import toast from 'react-hot-toast';

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
  const [isPending, setIsPending] = useState(false);
  const { isSignedIn, isLoaded, user } = useUnifiedAuth();
  const { getToken } = useAuth();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoaded || (!isSignedIn && !user)) {
      toast.error("يجب تسجيل الدخول لإضافة المفضلات ⚠️");
      return;
    }
    if (isPending) return;

    const desiredState = !isFavorite;
    setIsPending(true);
    setIsFavorite(desiredState);

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
        body: JSON.stringify({ mediaId, mediaType, title, posterPath, isFavorite: desiredState })
      });

      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setIsFavorite(isFavorite);
        toast.error(data.error || 'حدث خطأ أثناء التعديل');
      } else {
        const added = data.action === 'added';
        setIsFavorite(added);
        if (added) {
          toast.success(`تمت إضافة ${title} للمفضلة ❤️`);
        } else {
          toast(`تمت إزالة ${title} من المفضلة`, { icon: '🗑️' });
        }
      }
    } catch (err) {
      console.error(err);
      setIsFavorite(isFavorite);
      toast.error('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsPending(false);
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
