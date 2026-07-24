"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/utils/imageHelper";
import FavoriteButton from "@/components/FavoriteButton";

type Favorite = {
  id: string;
  mediaId: string;
  mediaType: string;
  title: string;
  posterPath: string | null;
};

import { useClerk } from "@clerk/nextjs";

export default function FavoritesList() {
  let closeUserProfile: (() => void) | undefined;
  try {
    const clerk = useClerk();
    closeUserProfile = clerk?.closeUserProfile;
  } catch (e) {
    // Pure Telegram Session
  }
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleBrowse = (e: React.MouseEvent) => {
    e.preventDefault();
    if (closeUserProfile) {
      closeUserProfile();
    }
    window.location.href = '/movies';
  };

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const res = await fetch('/api/favorites');
        const data = await res.json();
        if (data.success) {
          setFavorites(data.favorites);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center p-12 text-red-400">
        <p>حدث خطأ أثناء تحميل المفضلة.</p>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <i className="fa-regular fa-heart text-3xl text-gray-500"></i>
        </div>
        <h3 className="text-xl font-black text-white mb-2">لا توجد عناصر</h3>
        <p className="text-gray-400 text-sm max-w-[250px]">قم بإضافة أفلام ومسلسلات إلى مفضلتك لمشاهدتها لاحقاً.</p>
        <button 
          onClick={handleBrowse} 
          className="mt-6 px-6 py-2.5 bg-[#e50914] hover:bg-[#b91c1c] text-white font-extrabold rounded-xl transition-all shadow-[0_4px_18px_rgba(229,9,20,0.5)] active:scale-95 cursor-pointer"
        >
          تصفح المحتوى
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-2 rtl" dir="rtl">
      {favorites.map((fav) => (
        <div key={fav.id} className="relative group rounded-xl overflow-hidden shadow-lg bg-[#111] border border-white/10">
          <Link href={`/${fav.mediaType}/${fav.mediaId}`} className="block relative aspect-[2/3] w-full">
            {fav.posterPath ? (
              <Image
                src={getImageUrl(fav.posterPath, 'poster')}
                alt={fav.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <i className="fa-solid fa-film text-2xl text-gray-600"></i>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="absolute bottom-0 left-0 w-full p-3">
              <h4 className="text-white font-bold text-xs line-clamp-2 leading-tight drop-shadow-md">
                {fav.title}
              </h4>
              <span className="text-purple-400 text-[9px] font-bold mt-1 uppercase tracking-wider block">
                {fav.mediaType === 'movie' ? 'فيلم' : 'مسلسل'}
              </span>
            </div>
          </Link>

          {/* Action Buttons */}
          <div className="absolute top-2 left-2 z-10 scale-90 origin-top-left">
            <FavoriteButton 
              mediaId={fav.mediaId} 
              mediaType={fav.mediaType as 'movie' | 'tv'} 
              title={fav.title} 
              posterPath={fav.posterPath} 
              initialIsFavorite={true}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
