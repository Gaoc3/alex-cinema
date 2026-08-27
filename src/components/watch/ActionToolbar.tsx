'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ActionToolbarProps {
  isFavorite: boolean;
  toggleFavorite: () => void;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  handleVote: (type: 'like' | 'dislike') => void;
  videoId: string;
}

const FavoriteButton = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 cursor-pointer select-none active:scale-95 ${
      active
        ? 'bg-alex-primary text-white border-transparent shadow-[0_0_18px_rgba(229,9,20,0.5)]'
        : 'bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border-white/15'
    }`}
  >
    <i className={`fa-heart text-xs sm:text-sm ${active ? 'fa-solid' : 'fa-regular'}`}></i>
    <span>{active ? 'في المفضلة' : 'أضف للمفضلة'}</span>
  </button>
);

const ShareButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl sm:rounded-2xl border border-white/15 bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all duration-300 cursor-pointer select-none active:scale-95"
  >
    <i className="fa-solid fa-share-nodes text-xs sm:text-sm"></i>
    <span>مشاركة</span>
  </button>
);

const WatchWithFriendsButton = ({ videoId }: { videoId: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleWatchWithFriends = async () => {
    setIsLoading(true);
    try {
      const { createRoom } = await import('@/app/actions/room.actions');
      const res = await createRoom({ title: 'روم مشاهدة جماعية', movieId: videoId });
      if (res.success && res.roomId) {
        toast.success('تم إنشاء غرفة المشاهدة بنجاح');
        // In Telegram WebApp, dispatch a custom event for in-app room navigation
        const isTelegramWebApp = typeof window !== 'undefined' && !!(window as any).Telegram?.WebApp?.initDataUnsafe;
        if (isTelegramWebApp) {
          window.dispatchEvent(new CustomEvent('telegram:join-room', { detail: { roomId: res.roomId } }));
        } else {
          router.push(`/room/${res.roomId}?create=true`);
        }
      } else {
        toast.error(res.error || 'يجب تسجيل الدخول لإنشاء روم');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إنشاء الروم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleWatchWithFriends}
      disabled={isLoading}
      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl sm:rounded-2xl border border-red-500/60 bg-red-600 hover:bg-red-500 text-white transition-all duration-300 cursor-pointer select-none shadow-[0_0_18px_rgba(229,9,20,0.45)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <i className="fa-solid fa-spinner animate-spin text-xs sm:text-sm"></i>
      ) : (
        <i className="fa-solid fa-users text-xs sm:text-sm"></i>
      )}
      <span>شاهد مع الأصدقاء</span>
    </button>
  );
};

const VoteButton = ({
  type,
  count,
  active,
  onClick,
}: {
  type: 'like' | 'dislike';
  count: number;
  active: boolean;
  onClick: () => void;
}) => {
  const isLike = type === 'like';
  return (
    <button
      type="button"
      onClick={onClick}
      title={isLike ? 'أعجبني' : 'لم يعجبني'}
      className={`flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black px-3.5 py-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 cursor-pointer select-none active:scale-95 ${
        active
          ? isLike
            ? 'bg-green-600 text-white border-green-500 shadow-[0_0_12px_rgba(22,163,74,0.5)]'
            : 'bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.5)]'
          : isLike
          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
      }`}
    >
      <i className={`fa-solid fa-thumbs-${isLike ? 'up' : 'down'} text-xs sm:text-sm`}></i>
      <span className="font-en text-xs">{count}</span>
    </button>
  );
};

export default function ActionToolbar({
  isFavorite,
  toggleFavorite,
  likes,
  dislikes,
  userVote,
  handleVote,
  videoId,
}: ActionToolbarProps) {
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ رابط الصفحة لمشاركتها');
    }
  };

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
      {/* Primary Actions Grid on mobile, inline row on desktop */}
      <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
        <WatchWithFriendsButton videoId={videoId} />
        <FavoriteButton active={isFavorite} onClick={toggleFavorite} />
      </div>

      {/* Secondary Actions Row */}
      <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
        <ShareButton onClick={handleShare} />
        <div className="flex items-center gap-2 shrink-0">
          <VoteButton type="like" count={likes} active={userVote === 'like'} onClick={() => handleVote('like')} />
          <VoteButton type="dislike" count={dislikes} active={userVote === 'dislike'} onClick={() => handleVote('dislike')} />
        </div>
      </div>
    </div>
  );
}
