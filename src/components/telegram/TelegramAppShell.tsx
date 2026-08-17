'use client';

import React, { useCallback, useEffect, useState } from 'react';
import TelegramBottomNav, { type TelegramTab } from './TelegramBottomNav';
import TelegramHomeView from './TelegramHomeView';
import TelegramMoviesView from './TelegramMoviesView';
import TelegramSeriesView from './TelegramSeriesView';
import TelegramSearchView from './TelegramSearchView';
import TelegramCategoryView from './TelegramCategoryView';
import TelegramFavoritesView from './TelegramFavoritesView';
import TelegramRoomsView from './TelegramRoomsView';
import TelegramRoomOverlay from './TelegramRoomOverlay';
import TelegramWatchOverlay from './TelegramWatchOverlay';
import TelegramDetailsSheet from './TelegramDetailsSheet';
import TelegramProfileModal from './TelegramProfileModal';
import UserNav from '@/components/UserNav';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { getTelegramLaunchPayload, useTelegramSafeArea } from '@/lib/telegramWebAppClient';

export default function TelegramAppShell() {
  const [activeTab, setActiveTab] = useState<TelegramTab>('home');
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDetailsMovieId, setSelectedDetailsMovieId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; title: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { user, isLoaded, isSignedIn, refetchUser } = useUnifiedAuth();

  // 1. Silent Background Authentication on Mount
  useEffect(() => {
    const { initData, unsafeUser } = getTelegramLaunchPayload();
    if (initData) {
      fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ initData, telegramData: unsafeUser }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            void refetchUser();
          }
        })
        .catch((err) => console.error('[TelegramAppShell Auto-Auth]:', err));
    }
  }, [refetchUser]);

  // 2. Deep Link Parser (start_param from Bot: e.g. room_xxx or movie_3112880 or 3112880)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const startParam = (tg.initDataUnsafe as any)?.start_param || new URLSearchParams(window.location.search).get('startapp');
    if (startParam) {
      if (startParam.startsWith('room_')) {
        const roomId = startParam.replace(/^room_/i, '');
        if (roomId) setSelectedRoomId(roomId);
      } else {
        const cleanId = startParam.replace(/^(?:movie_|watch_|series_)/i, '');
        if (cleanId && /^\d+$/.test(cleanId)) {
          setSelectedMovieId(cleanId);
        }
      }
    }

    // Auto Fullscreen on Desktop / macOS / Web
    const platform = (((tg as any).platform as string) || '').toLowerCase();
    const isDesktop =
      platform === 'tdesktop' ||
      platform === 'macos' ||
      platform === 'weba' ||
      platform === 'webk' ||
      platform === 'web' ||
      platform === 'tablet';

    if (isDesktop) {
      try {
        tg.expand?.();
        (tg as any).requestFullscreen?.();
        setIsFullscreen(true);
      } catch (e) {
        console.warn('[Telegram Auto-Fullscreen Error]:', e);
      }
    }

    // Sync fullscreen state
    if (typeof (tg as any).isFullscreen === 'boolean') {
      setIsFullscreen((tg as any).isFullscreen);
    }
  }, []);

  // 3. Custom Event Listener for in-app room join
  useEffect(() => {
    const handleJoinEvent = (e: any) => {
      const roomId = e.detail?.roomId;
      if (roomId) {
        setSelectedRoomId(roomId);
      }
    };
    window.addEventListener('telegram:join-room', handleJoinEvent);
    return () => window.removeEventListener('telegram:join-room', handleJoinEvent);
  }, []);

  // 4. Telegram BackButton Global Priority Stack
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    const handleBackClick = () => {
      if (selectedRoomId) {
        setSelectedRoomId(null);
        return;
      }
      if (selectedMovieId) {
        setSelectedMovieId(null);
        return;
      }
      if (selectedDetailsMovieId) {
        setSelectedDetailsMovieId(null);
        return;
      }
      if (isProfileOpen) {
        setIsProfileOpen(false);
        return;
      }
      if (selectedCategory) {
        setSelectedCategory(null);
        return;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }
      try {
        tg?.close?.();
      } catch {}
    };

    const hasActiveStack =
      Boolean(selectedRoomId) ||
      Boolean(selectedMovieId) ||
      Boolean(selectedDetailsMovieId) ||
      Boolean(selectedCategory) ||
      isProfileOpen ||
      activeTab !== 'home';

    if (hasActiveStack) {
      try {
        tg.BackButton.show();
        tg.BackButton.onClick(handleBackClick);
      } catch {}
    } else {
      try {
        tg.BackButton.hide();
        tg.BackButton.offClick(handleBackClick);
      } catch {}
    }

    return () => {
      try {
        tg?.BackButton?.offClick(handleBackClick);
      } catch {}
    };
  }, [selectedRoomId, selectedMovieId, selectedDetailsMovieId, selectedCategory, isProfileOpen, activeTab]);

  const toggleFullscreen = () => {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof (tg as any).requestFullscreen === 'function') {
      try {
        if ((tg as any).isFullscreen) {
          (tg as any).exitFullscreen?.();
          setIsFullscreen(false);
        } else {
          (tg as any).requestFullscreen?.();
          setIsFullscreen(true);
        }
        return;
      } catch (err) {
        console.warn('[Telegram toggleFullscreen]:', err);
      }
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSelectMovie = useCallback((id: string) => {
    setSelectedDetailsMovieId(id);
  }, []);

  const handleWatchMovie = useCallback((id: string) => {
    setSelectedMovieId(id);
  }, []);

  const handleSelectCategory = useCallback((id: string, title: string) => {
    setSelectedCategory({ id, title });
  }, []);

  const handleSelectTab = (tab: TelegramTab) => {
    setSelectedCategory(null);
    setSelectedDetailsMovieId(null);
    setSelectedMovieId(null);
    setSelectedRoomId(null);
    setIsProfileOpen(false);
    setActiveTab(tab);
  };

  const { contentSafeArea, safeArea, isDesktopOrWeb } = useTelegramSafeArea();

  const headerPaddingRight = Math.max(
    contentSafeArea.right,
    safeArea.right,
    isDesktopOrWeb ? 34 : 12
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
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col relative select-none">
      {/* Top App Header with Compact Natural Telegram Insets */}
      <header
        className="sticky top-0 z-40 w-full flex items-center justify-between bg-[#0d1322]/95 backdrop-blur-2xl border-b border-white/20 shadow-lg safe-top transition-all"
        style={{
          paddingLeft: `${headerPaddingLeft}px`,
          paddingRight: `${headerPaddingRight}px`,
          paddingTop: `${headerPaddingTop + 4}px`,
          paddingBottom: '14px',
        }}
      >
        <div
          onClick={() => handleSelectTab('home')}
          className="flex items-center gap-3.5 cursor-pointer group active:scale-95 transition-all"
        >
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center shadow-[0_0_25px_rgba(229,9,20,0.65)] border-2 border-white/25 shrink-0 group-hover:border-alex-primary/80 transition-all">
            <img
              src="/logo.svg"
              alt="AleX Cinema"
              className="w-full h-full object-cover scale-[1.08]"
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-black tracking-wide text-white flex items-center gap-1 font-sans group-hover:text-alex-primary transition-colors">
              <span>ALEX CINEMA</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-200 hover:text-white text-base sm:text-lg transition-all border border-white/20 shadow-md cursor-pointer"
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          </button>

          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => handleSelectTab('search')}
            title="بحث"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-200 hover:text-white text-base sm:text-lg transition-all border border-white/20 shadow-md cursor-pointer"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>

          {/* Real Unified User Profile Nav */}
          {isSignedIn && user ? (
            <UserNav
              size="normal"
              onOpenFavorites={() => handleSelectTab('profile')}
              onOpenRooms={() => handleSelectTab('rooms')}
            />
          ) : !isLoaded ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 animate-pulse border-2 border-white/20"></div>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectTab('profile')}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-200 hover:text-white text-base sm:text-lg transition-all border border-white/20 cursor-pointer shadow-md"
            >
              <i className="fa-solid fa-user"></i>
            </button>
          )}
        </div>
      </header>


      {/* Main View Port Container */}
      <main className="flex-grow px-3 sm:px-6 pt-3">
        {selectedCategory ? (
          <TelegramCategoryView
            categoryId={selectedCategory.id}
            categoryTitle={selectedCategory.title}
            onBack={() => setSelectedCategory(null)}
            onSelectMovie={handleSelectMovie}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <TelegramHomeView
                onSelectMovie={handleSelectMovie}
                onWatchMovie={handleWatchMovie}
                onOpenDetails={handleSelectMovie}
                onSelectCategory={handleSelectCategory}
              />
            )}
            {activeTab === 'movies' && <TelegramMoviesView onSelectMovie={handleSelectMovie} />}
            {activeTab === 'series' && <TelegramSeriesView onSelectMovie={handleSelectMovie} />}
            {activeTab === 'rooms' && (
              <TelegramRoomsView onJoinRoom={(roomId) => setSelectedRoomId(roomId)} />
            )}
            {activeTab === 'search' && <TelegramSearchView onSelectMovie={handleSelectMovie} />}
            {activeTab === 'profile' && <TelegramFavoritesView onSelectMovie={handleSelectMovie} />}
          </>
        )}
      </main>

      {/* Movie Details Sheet / Modal */}
      {selectedDetailsMovieId && (
        <TelegramDetailsSheet
          movieId={selectedDetailsMovieId}
          onClose={() => setSelectedDetailsMovieId(null)}
          onWatch={(id) => {
            setSelectedDetailsMovieId(null);
            setSelectedMovieId(id);
          }}
        />
      )}

      {/* In-Memory Fullscreen Watch Player Layer */}
      {selectedMovieId && (
        <TelegramWatchOverlay
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}

      {/* In-Memory Fullscreen Room Watch Party Layer */}
      {selectedRoomId && (
        <TelegramRoomOverlay
          roomId={selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
        />
      )}

      {/* User Profile Modal */}
      {isProfileOpen && (
        <TelegramProfileModal
          user={user ? { id: Number(user.telegramId || 0), first_name: user.name, photo_url: user.imageUrl || undefined } : null}
          onClose={() => setIsProfileOpen(false)}
          onOpenFavorites={() => {
            setIsProfileOpen(false);
            setActiveTab('profile');
          }}
          onOpenRooms={() => {
            setIsProfileOpen(false);
            setActiveTab('rooms');
          }}
        />
      )}

      {/* Bottom Floating Glass Navigation Bar (Hidden during full watch or room session) */}
      {!selectedMovieId && !selectedRoomId && (
        <TelegramBottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />
      )}
    </div>
  );
}
