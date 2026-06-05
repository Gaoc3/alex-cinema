import React from 'react';

interface ActionToolbarProps {
  isFavorite: boolean;
  toggleFavorite: () => void;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  handleVote: (type: 'like' | 'dislike') => void;
}

export default function ActionToolbar({
  isFavorite,
  toggleFavorite,
  likes,
  dislikes,
  userVote,
  handleVote
}: ActionToolbarProps) {
  return (
    <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleFavorite}
          className={`flex items-center gap-2.5 font-bold text-sm px-5 py-2.5 rounded-xl border transition-all hover-scale cursor-pointer ${
            isFavorite 
              ? 'bg-alex-primary text-white border-alex-primary shadow-[0_0_15px_rgba(229,9,20,0.4)]' 
              : 'bg-white/5 text-gray-300 border-white/5 hover:text-white hover:bg-white/10'
          }`}
        >
          <i className={`fa-heart text-lg ${isFavorite ? 'fa-solid' : 'fa-regular'}`}></i> 
          {isFavorite ? 'مضاف للمفضلة' : 'أضف للمفضلة'}
        </button>
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') {
              navigator.clipboard.writeText(window.location.href);
              alert('تم نسخ رابط الصفحة لمشاركتها!');
            }
          }}
          className="flex items-center gap-2.5 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-bold text-sm bg-white/5 px-5 py-2.5 rounded-xl border border-white/5 hover-scale cursor-pointer"
        >
          <i className="fa-solid fa-share-nodes text-lg"></i> مشاركة
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => handleVote('like')}
          className={`flex items-center gap-2 text-sm font-bold px-3.5 py-2 rounded-xl border transition-all hover-scale cursor-pointer ${
            userVote === 'like'
              ? 'bg-green-600 text-white border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.4)]'
              : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 hover:text-green-300'
          }`}
          title="أعجبني"
        >
          <i className="fa-solid fa-thumbs-up text-base"></i> 
          <span className="font-en">{likes}</span>
        </button>
        <button 
          onClick={() => handleVote('dislike')}
          className={`flex items-center gap-2 text-sm font-bold px-3.5 py-2 rounded-xl border transition-all hover-scale cursor-pointer ${
            userVote === 'dislike'
              ? 'bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]'
              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300'
          }`}
          title="لم يعجبني"
        >
          <i className="fa-solid fa-thumbs-down text-base"></i> 
          <span className="font-en">{dislikes}</span>
        </button>
      </div>
    </div>
  );
}
