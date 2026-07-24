import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ActionToolbarProps {
  isFavorite: boolean;
  toggleFavorite: () => void;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  handleVote: (type: 'like' | 'dislike') => void;
  videoId: string;
}

/* ── Presentational sub-components (Zero-legacy: pure, no side-effects) ── */

const FavoriteButton = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
      active
        ? 'bg-alex-primary text-white border-transparent shadow-[0_0_20px_rgba(229,9,20,0.4)]'
        : 'bg-white/5 hover:bg-alex-primary/80 text-white border-white/10 hover:border-transparent hover:shadow-[0_0_20px_rgba(229,9,20,0.3)]'
    }`}
  >
    <i className={`fa-heart text-base ${active ? 'fa-solid' : 'fa-regular'}`}></i>
    {active ? 'في المفضلة' : 'أضف للمفضلة'}
  </button>
);

const ShareButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white hover:text-black text-white transition-all duration-300 cursor-pointer select-none hover:shadow-md"
  >
    <i className="fa-solid fa-share-nodes text-base"></i> مشاركة
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
        router.push(`/room/${res.roomId}?create=true`);
      } else {
        alert(res.error || 'يجب تسجيل الدخول لإنشاء روم');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إنشاء الروم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleWatchWithFriends}
      disabled={isLoading}
      className="flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-2xl border border-purple-500 bg-purple-600 hover:bg-purple-500 text-white transition-all duration-300 cursor-pointer select-none shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <i className="fa-solid fa-spinner animate-spin text-base"></i>
      ) : (
        <i className="fa-solid fa-users text-base"></i>
      )}
      شاهد مع الأصدقاء
    </button>
  );
};

const VoteButton = ({ type, count, active, onClick }: {
  type: 'like' | 'dislike';
  count: number;
  active: boolean;
  onClick: () => void;
}) => {
  const isLike = type === 'like';
  const baseColor = isLike ? 'green' : 'red';
  return (
    <button
      onClick={onClick}
      title={isLike ? 'أعجبني' : 'لم يعجبني'}
      className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
        active
          ? `bg-${baseColor}-600 text-white border-${baseColor}-600 shadow-[0_0_12px_rgba(${isLike ? '22,163,74' : '220,38,38'},0.4)]`
          : `bg-${baseColor}-500/10 text-${baseColor}-400 border-${baseColor}-500/20 hover:bg-${baseColor}-500/20`
      }`}
    >
      <i className={`fa-solid fa-thumbs-${isLike ? 'up' : 'down'} text-sm`}></i>
      <span className="font-en text-xs">{count}</span>
    </button>
  );
};

/* ── Main toolbar container (Zero-legacy: no border/margin – parent controls spacing) ── */

export default function ActionToolbar({
  isFavorite, toggleFavorite, likes, dislikes, userVote, handleVote, videoId
}: ActionToolbarProps) {
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ رابط الصفحة لمشاركتها!');
    }
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3">
      {/* Right side: Primary actions */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <WatchWithFriendsButton videoId={videoId} />
        <FavoriteButton active={isFavorite} onClick={toggleFavorite} />
        <ShareButton onClick={handleShare} />
      </div>

      {/* Left side: Voting */}
      <div className="flex items-center gap-2">
        <VoteButton type="like" count={likes} active={userVote === 'like'} onClick={() => handleVote('like')} />
        <VoteButton type="dislike" count={dislikes} active={userVote === 'dislike'} onClick={() => handleVote('dislike')} />
      </div>
    </div>
  );
}
