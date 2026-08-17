'use client';

import React, { useEffect, useState } from 'react';
import WatchContainer from '@/components/WatchContainer';
import { useTelegramSafeArea } from '@/lib/telegramWebAppClient';

interface TelegramWatchOverlayProps {
  movieId: string | null;
  onClose: () => void;
}

export default function TelegramWatchOverlay({ movieId, onClose }: TelegramWatchOverlayProps) {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<any | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { contentSafeArea, safeArea, isDesktopOrWeb } = useTelegramSafeArea();

  useEffect(() => {
    if (!movieId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setVideo(null);

    // Disable background page scroll
    document.body.style.overflow = 'hidden';

    // Hook Telegram BackButton
    const tg = window.Telegram?.WebApp;
    const handleBack = () => {
      onClose();
    };

    if (tg?.BackButton) {
      try {
        tg.BackButton.show();
        tg.BackButton.onClick(handleBack);
      } catch {}
    }

    async function loadData() {
      try {
        const res = await fetch(`/api/bot?action=details&id=${encodeURIComponent(movieId!)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('تعذر تحميل بيانات الفيديو');
        const data = await res.json();
        if (!data.success || !data.video) throw new Error(data.error || 'لم يتم العثور على العمل');

        if (isMounted) {
          setVideo(data.video);
          setSeasons(data.video.seasons || []);
          setEpisodes(data.video.episodes || []);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[TelegramWatchOverlay Error]:', err);
          setError(err.message || 'حدث خطأ في تحميل المشغل');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
      document.body.style.overflow = '';
      if (tg?.BackButton) {
        try {
          tg.BackButton.offClick(handleBack);
          tg.BackButton.hide();
        } catch {}
      }
    };
  }, [movieId, onClose]);

  if (!movieId) return null;

  const headerPaddingRight = Math.max(
    contentSafeArea.right,
    safeArea.right,
    isDesktopOrWeb ? 40 : 12
  );
  const headerPaddingLeft = Math.max(
    contentSafeArea.left,
    safeArea.left,
    12
  );
  const headerPaddingTop = Math.max(
    contentSafeArea.top,
    safeArea.top,
    isDesktopOrWeb ? 8 : 4
  );

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-[#070b13] text-white animate-fade-in overflow-hidden">
      {/* Top Header Bar with Compact Telegram Safe Area */}
      <div
        className="flex-shrink-0 flex items-center justify-between bg-[#0d1322]/95 border-b border-white/15 backdrop-blur-xl z-20 transition-all"
        style={{
          paddingLeft: `${headerPaddingLeft}px`,
          paddingRight: `${headerPaddingRight}px`,
          paddingTop: `${headerPaddingTop}px`,
          paddingBottom: '10px',
        }}
      >
        <div className="flex items-center gap-3.5 overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="رجوع"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white text-base transition-all shadow-md flex-shrink-0 cursor-pointer border border-white/15"
          >
            <i className="fa-solid fa-arrow-right text-sm sm:text-base"></i>
          </button>
          <div className="overflow-hidden">
            <h2 className="text-sm sm:text-base font-black text-white truncate max-w-[240px] sm:max-w-md">
              {video?.ar_title || video?.en_title || 'جاري التحميل...'}
            </h2>
            {video?.year ? (
              <span className="text-xs text-gray-400 font-bold">{video.year} • {video.kind === '2' ? 'مسلسل' : 'فيلم'}</span>
            ) : null}
          </div>
        </div>
      </div>


      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto overscroll-contain px-2 sm:px-6 py-4 pb-20">
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-alex-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(229,9,20,0.4)]"></div>
            <p className="text-gray-300 font-bold text-xs">جاري تهيئة المشغل والجودات...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-red-950/20 border border-red-500/30 rounded-2xl max-w-md mx-auto my-8">
            <i className="fa-solid fa-triangle-exclamation text-3xl text-red-500 mb-3"></i>
            <p className="text-white font-bold mb-4 text-xs">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-alex-primary text-white text-xs font-bold"
            >
              الرجوع للرئيسية
            </button>
          </div>
        )}

        {!loading && !error && video && (
          <WatchContainer
            video={video}
            seasons={seasons}
            episodes={episodes}
          />
        )}
      </div>
    </div>
  );
}
