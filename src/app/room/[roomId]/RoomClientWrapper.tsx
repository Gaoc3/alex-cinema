'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import RoomPlayerUI from '@/components/watch/RoomPlayerUI';
import type { RoomVideoData } from '@/components/watch/PlayerSection';
import type { SeriesEpisode, SeriesSeason } from '@/components/watch/SeriesNavigator';
import { useWatchRoom } from '@/hooks/useWatchRoom';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import RoomSidebar, { type RoomTab } from '@/components/watch/RoomSidebar';
import { getVideoImageUrl } from '@/utils/imageHelper';
import LobbySearch from './LobbySearch';
import UserAvatar from '@/components/UserAvatar';
import { isTelegramWebAppContext } from '@/lib/telegramWebAppClient';

interface RoomClientWrapperProps {
  roomId: string;
  roomData: {
    hostId: string;
    title?: string | null;
    isPrivate?: boolean;
    host?: { name?: string | null; imageUrl?: string | null } | null;
  };
  currentUserId: string | null;
  isHostUser: boolean;
  video: RoomVideoData | null;
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
  onExit?: () => void;
}

function RoomStateScreen({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  autoRedirectSeconds = 5,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  autoRedirectSeconds?: number | null;
}) {
  const [countdown, setCountdown] = useState<number | null>(autoRedirectSeconds);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      onAction();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, onAction]);

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-[#050811] p-4 text-white" dir="rtl">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-[#090e1d]/95 p-8 sm:p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_50px_rgba(229,9,20,0.2)] backdrop-blur-2xl animate-scaleIn">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 size-56 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-56 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl border border-red-500/35 bg-red-600/20 text-3xl text-red-400 shadow-[0_0_35px_rgba(229,9,20,0.35)]">
          <i className={icon} aria-hidden="true" />
        </div>
        <h1 className="mb-3 text-2xl sm:text-3xl font-black text-white">{title}</h1>
        <p className="mb-6 text-sm leading-7 text-slate-300 font-medium">{description}</p>

        {countdown !== null && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 px-4 text-xs text-slate-400">
            <i className="fa-solid fa-clock text-amber-400" aria-hidden="true" />
            <span>سيتم تحويلك تلقائياً خلال <strong className="text-white font-mono text-sm">{countdown}</strong> ثوانٍ...</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="w-full sm:flex-1 min-h-12 cursor-pointer rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-[0_8px_25px_rgba(229,9,20,0.4)] transition-all active:scale-95"
            >
              {secondaryActionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onAction}
            className={`w-full ${secondaryActionLabel ? 'sm:flex-1' : ''} min-h-12 cursor-pointer rounded-2xl ${
              secondaryActionLabel
                ? 'border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_8px_25px_rgba(229,9,20,0.4)]'
            } px-6 py-3.5 text-xs sm:text-sm font-black transition-all active:scale-95`}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomClientWrapper({
  roomId,
  roomData,
  currentUserId,
  isHostUser: isHostUserProp,
  video,
  seasons,
  episodes,
  onExit,
}: RoomClientWrapperProps) {
  const { user, isLoaded } = useUser();
  const { user: unifiedUser } = useUnifiedAuth();
  const [activeRoomTab, setActiveRoomTab] = useState<RoomTab>('chat');
  const sidebarPanelRef = useRef<HTMLElement>(null);
  const router = useRouter();

  const initialIsHostUser = Boolean(
    isHostUserProp
    || currentUserId === roomData.hostId
    || unifiedUser?.id === roomData.hostId,
  );
  const username = unifiedUser?.name
    || (user ? (user.fullName || user.firstName || user.username || 'مشاهد') : null)
    || (initialIsHostUser && roomData.host?.name ? roomData.host.name : `ضيف ${roomId.slice(0, 4)}`);
  const currentAvatarUrl = unifiedUser?.imageUrl || user?.imageUrl || null;

  const roomHook = useWatchRoom(roomId, initialIsHostUser, username, currentAvatarUrl);
  const isHostUser = roomHook.isHost;
  const connectionMeta = {
    connecting: { label: 'جارٍ الاتصال', color: 'bg-amber-400' },
    connected: { label: 'مباشر', color: 'bg-emerald-400' },
    reconnecting: { label: 'إعادة اتصال', color: 'bg-amber-400 motion-safe:animate-pulse' },
    offline: { label: 'غير متصل', color: 'bg-red-500' },
  }[roomHook.connectionState];

  useEffect(() => {
    const currentVideoId = video?.nb || video?.id || null;
    if (roomHook.remoteVideoId && roomHook.remoteVideoId !== currentVideoId) {
      router.push(`/room/${roomId}?videoId=${roomHook.remoteVideoId}`);
    }
  }, [roomHook.remoteVideoId, video, roomId, router]);

  useEffect(() => {
    if (roomHook.connectionError) {
      toast.error(roomHook.connectionError, { id: `room-socket-${roomId}` });
    }
  }, [roomHook.connectionError, roomId]);

  const [displayTitle, setDisplayTitle] = useState(roomData.title || 'غرفة المشاهدة');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(roomData.title || 'غرفة المشاهدة');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const handleShareRoom = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && window.matchMedia('(max-width: 1023px)').matches) {
        await navigator.share({ title: roomData.title || 'غرفة أليكس سينما', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط الغرفة بنجاح 📋');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('تعذر مشاركة الرابط');
    }
  };

  const showMembersPanel = () => {
    setActiveRoomTab('members');
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    window.requestAnimationFrame(() => {
      sidebarPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleExitRoom = () => {
    if (onExit) {
      onExit();
      return;
    }
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/tg-app')) {
      router.push('/tg-app');
    } else {
      router.push('/rooms');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;

    if (isTelegramWebAppContext()) {
      const handleTgBack = () => {
        handleExitRoom();
      };
      try {
        tg.BackButton.show();
        tg.BackButton.onClick(handleTgBack);
      } catch {}

      return () => {
        try {
          tg.BackButton.offClick(handleTgBack);
        } catch {}
      };
    }
  }, []);

  const [isMediaSwitcherOpen, setIsMediaSwitcherOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMediaSwitcherOpen) {
        setIsMediaSwitcherOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMediaSwitcherOpen]);

  const bgImage = video ? getVideoImageUrl(video) : null;
  const uniqueMembers = React.useMemo(() => {
    const seen = new Map<string, typeof roomHook.members[0]>();
    for (const m of roomHook.members) {
      const key = (m as any).userId || (m as any).identity || m.name || m.id;
      if (!seen.has(key) || m.isHost) {
        seen.set(key, m);
      }
    }
    return Array.from(seen.values());
  }, [roomHook.members]);

  const visibleMembers = uniqueMembers.slice(0, 3);
  const memberCount = Math.max(uniqueMembers.length, 1);
  const canChangeMedia = isHostUser || roomHook.userPermissions.canChangeMedia;

  if (!isLoaded) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#050811]" role="status" aria-label="جارٍ تحميل الغرفة">
        <div className="size-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent shadow-lg shadow-red-600/30" />
      </div>
    );
  }

  if (roomHook.isSessionReplaced) {
    return (
      <RoomStateScreen
        icon="fa-solid fa-mobile-screen-button"
        title="تم تسجيل الدخول من جهاز آخر"
        description={roomHook.sessionReplacedMessage || 'تم إيقاف هذه الجلسة لأنك قمت بالانضمام إلى هذه الغرفة من جهاز أو متصفح آخر بحسابك.'}
        actionLabel="العودة للرئيسية"
        onAction={handleExitRoom}
        secondaryActionLabel="إعادة الدخول من هذا الجهاز"
        onSecondaryAction={() => window.location.reload()}
        autoRedirectSeconds={null}
      />
    );
  }

  if (roomHook.isBanned) {
    return (
      <RoomStateScreen
        icon="fa-solid fa-user-slash"
        title="تم حظرك نهائياً من الغرفة"
        description={roomHook.banReason || 'حُظرت من المشاركة في هذه الغرفة مستقبلاً.'}
        actionLabel="العودة"
        onAction={handleExitRoom}
      />
    );
  }

  if (roomHook.isKicked) {
    return (
      <RoomStateScreen
        icon="fa-solid fa-ban"
        title="تم إخراجك من الغرفة"
        description="أنهى المضيف مشاركتك في جلسة المشاهدة الحالية."
        actionLabel="العودة"
        onAction={handleExitRoom}
      />
    );
  }

  if (roomHook.isRoomClosed) {
    return (
      <RoomStateScreen
        icon="fa-solid fa-door-closed"
        title="انتهت جلسة المشاهدة"
        description="أغلق المضيف هذه الغرفة. يمكنك الانضمام إلى جلسة أخرى من صفحة الغرف."
        actionLabel="العودة للغرف"
        onAction={handleExitRoom}
      />
    );
  }

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSavingTitle) return;
    setIsSavingTitle(true);
    try {
      const response = await fetch('/api/rooms/update-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, title: newTitle.trim() }),
      });
      const res = await response.json();
      if (res.success && res.title) {
        setDisplayTitle(res.title);
        setIsEditingTitle(false);
        toast.success('تم تغيير اسم الغرفة بنجاح');
      } else {
        toast.error(res.error || 'فشل تغيير اسم الغرفة');
      }
    } catch {
      toast.error('حدث خطأ أثناء تعديل اسم الغرفة');
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#03060f] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(229,9,20,0.16),rgba(6,18,33,0.5)_45%,#02040a_100%)] text-white selection:bg-red-600 selection:text-white" dir="rtl">
      {/* Dynamic Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {bgImage ? (
          <div
            className="absolute inset-x-0 top-0 h-[70svh] bg-cover bg-center opacity-[0.16] blur-3xl transition-opacity duration-1000 scale-105"
            style={{ backgroundImage: `linear-gradient(to bottom, transparent, #03060f), url(${bgImage})` }}
          />
        ) : (
          <div className="absolute inset-x-0 top-0 h-[45svh] bg-gradient-to-b from-red-600/15 via-transparent to-transparent blur-3xl" />
        )}
        <div className="absolute -right-32 top-10 size-96 rounded-full bg-red-600/12 blur-[140px]" />
        <div className="absolute -left-32 bottom-10 size-96 rounded-full bg-blue-600/12 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl 2xl:max-w-[1560px] flex-col px-3 pb-24 sm:pb-32 lg:pb-36 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 lg:px-6">
        {/* Luxury Top Header */}
        <header className="mb-4 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0f1d]/85 p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {/* Right Section: Back button & Room Title */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleExitRoom}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:border-red-500/40 hover:bg-red-600/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-95"
              aria-label="العودة إلى الغرف"
              title="العودة إلى الغرف"
            >
              <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true" />
            </button>

            <div className="min-w-0">
              {isEditingTitle ? (
                <form onSubmit={handleSaveTitle} className="flex items-center gap-1.5 min-w-0 max-w-xs sm:max-w-sm">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={50}
                    className="min-h-8 w-full min-w-0 rounded-lg border border-red-500/60 bg-black/60 px-2.5 text-xs sm:text-sm font-bold text-white outline-none focus:ring-2 focus:ring-red-500/30"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isSavingTitle}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white hover:bg-red-700 cursor-pointer shadow-md shadow-red-600/30"
                    title="حفظ"
                  >
                    <i className={isSavingTitle ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-check"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 cursor-pointer"
                    title="إلغاء"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm sm:text-base font-black text-white tracking-wide" title={displayTitle}>
                    {displayTitle}
                  </h1>
                  {isHostUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle(displayTitle);
                        setIsEditingTitle(true);
                      }}
                      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                      title="إعادة تسمية الغرفة"
                      aria-label="إعادة تسمية الغرفة"
                    >
                      <i className="fa-solid fa-pen text-[10px]" aria-hidden="true" />
                    </button>
                  )}
                  {roomData.isPrivate && (
                    <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black text-amber-300">
                      <i className="fa-solid fa-lock ml-1" aria-hidden="true" />
                      خاصة
                    </span>
                  )}
                </div>
              )}

              {/* Sub-meta details */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <UserAvatar imageUrl={roomData.host?.imageUrl} name={roomData.host?.name} className="size-4 border border-white/20 text-[7px]" />
                  <span className="max-w-28 truncate font-medium">{roomData.host?.name || 'مستخدم أليكس'}</span>
                </span>
                <span className="h-2.5 w-px bg-white/15" />
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-1.5 rounded-full ${connectionMeta.color}`} />
                  <span className="text-[10px] text-slate-300 font-medium">{connectionMeta.label}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Left Section: Active Members & Share Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showMembersPanel}
              className="flex min-h-10 shrink-0 cursor-pointer items-center rounded-xl border border-white/10 bg-white/[0.04] px-2.5 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label={`عرض أعضاء الغرفة، العدد ${memberCount}`}
            >
              <i className="fa-solid fa-users text-slate-300 min-[430px]:hidden" aria-hidden="true" />
              <span className="hidden -space-x-2 space-x-reverse min-[430px]:flex" aria-hidden="true">
                {visibleMembers.map((member) => (
                  <UserAvatar key={member.id} imageUrl={member.avatarUrl} name={member.name} className="size-6 border-2 border-[#0a0f1d] text-[9px]" />
                ))}
              </span>
              <span className="mr-1.5 text-xs font-black text-slate-200 min-[430px]:mr-2">{memberCount}</span>
            </button>

            <button
              type="button"
              onClick={handleShareRoom}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label="مشاركة رابط الغرفة"
              title="مشاركة الغرفة"
            >
              <i className="fa-solid fa-share-nodes text-xs" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid min-h-0 flex-1 items-start gap-4 lg:gap-5 lg:grid-cols-[25.5rem_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)] 2xl:grid-cols-[30rem_minmax(0,1fr)]" dir="rtl">
          {/* Lounge Sidebar: Right side on Desktop (Order 1 in RTL), under player on Mobile */}
          <aside ref={sidebarPanelRef} className="order-2 min-w-0 scroll-mt-4 lg:order-1 lg:sticky lg:top-4 lg:self-start" dir="rtl">
            <RoomSidebar
              roomId={roomId}
              initialPrivacy={roomData.isPrivate ?? false}
              members={roomHook.members}
              messages={roomHook.messages}
              connectionState={roomHook.connectionState}
              isChatHistoryLoaded={roomHook.isChatHistoryLoaded}
              sendChatMessage={roomHook.sendChatMessage}
              editChatMessage={roomHook.editChatMessage}
              deleteChatMessage={roomHook.deleteChatMessage}
              reactToMessage={roomHook.reactToMessage}
              currentUserId={currentUserId}
              currentSocketId={roomHook.currentSocketId}
              isHost={isHostUser}
              userRole={roomHook.userRole}
              userPermissions={roomHook.userPermissions}
              setModeratorPermissions={roomHook.setModeratorPermissions}
              removeModerator={roomHook.removeModerator}
              kickUser={roomHook.kickUser}
              banUser={roomHook.banUser}
              closeRoom={roomHook.closeRoom}
              activeTab={activeRoomTab}
              onActiveTabChange={setActiveRoomTab}
              onLeaveRoom={handleExitRoom}
            />
          </aside>

          {/* Main Cinema Stage (Player & Discovery): Left side on Desktop (Order 2 in RTL), top on Mobile */}
          <section className="order-1 min-w-0 lg:order-2" dir="rtl">
            {!video ? (
              <div className="relative overflow-hidden flex min-h-[min(34svh,17rem)] sm:min-h-[min(38svh,21rem)] lg:min-h-[min(43svh,24.5rem)] items-center justify-center rounded-3xl border border-white/10 bg-[#0a0f1d]/85 p-5 sm:p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="absolute -top-20 -left-20 size-48 rounded-full bg-red-600/10 blur-[80px] pointer-events-none" />
                <div className="w-full text-center relative z-10">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border border-red-500/30 bg-gradient-to-tr from-red-600/20 to-red-500/5 text-2xl text-red-500 shadow-[0_0_25px_rgba(229,9,20,0.2)]">
                    <i className="fa-solid fa-clapperboard" aria-hidden="true" />
                  </div>
                  <h2 className="mb-1 text-xl font-black sm:text-2xl text-white tracking-wide">
                    {canChangeMedia ? 'اختر ما ستشاهدونه الليلة' : 'بانتظار اختيار المحتوى'}
                  </h2>
                  <p className="mx-auto mb-4 max-w-md text-xs sm:text-sm leading-relaxed text-slate-400">
                    {canChangeMedia
                      ? 'ابحث عن فيلم أو مسلسل، وسيبدأ العرض فوراً لجميع المشاركين المتواجدين بالروم.'
                      : 'سيبدأ البث والمشاهدة تلقائياً بمجرد أن يختار المضيف أو المشرف المحتوى.'}
                  </p>
                  {canChangeMedia ? (
                    <LobbySearch roomId={roomId} onVideoSelected={roomHook.changeVideo} />
                  ) : (
                    <div className="flex justify-center items-center gap-2 py-4" role="status" aria-label="بانتظار المضيف">
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="size-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
                <RoomPlayerUI
                  video={video}
                  seasons={seasons}
                  episodes={episodes}
                  roomHook={roomHook}
                />

                {canChangeMedia && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0f1d]/85 p-3.5 shadow-lg backdrop-blur-xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-red-600/15 text-red-500 border border-red-500/25 shadow-[0_0_20px_rgba(229,9,20,0.25)]">
                        <i className="fa-solid fa-film text-sm" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-white">تغيير العمل المعروض</p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          ابحث عن فيلم أو مسلسل آخر للبث الفوري لجميع المشاركين
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMediaSwitcherOpen(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-red-600/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <i className="fa-solid fa-magnifying-glass text-xs" />
                      <span>فتح مكتبة العرض 🎬</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Cinema Library Modal Drawer */}
        {isMediaSwitcherOpen && mounted && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-3 sm:p-5 lg:p-6 backdrop-blur-2xl animate-fadeIn"
            dir="rtl"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsMediaSwitcherOpen(false);
            }}
          >
            <div
              className="relative m-auto flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#080d1a] shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(229,9,20,0.2)] animate-scaleIn text-right"
              role="dialog"
              aria-modal="true"
              aria-labelledby="media-switcher-title"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-red-600/15 text-red-500 border border-red-500/25 shadow-[0_0_20px_rgba(229,9,20,0.25)]">
                    <i className="fa-solid fa-clapperboard text-sm" />
                  </div>
                  <div>
                    <h3 id="media-switcher-title" className="text-base font-black text-white">
                      مكتبة عروض الغرفة
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      اختر أي فيلم أو مسلسل ليبدأ البث المباشر فوراً لجميع الحاضرين
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMediaSwitcherOpen(false)}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                  aria-label="إغلاق"
                >
                  <i className="fa-solid fa-xmark text-base" />
                </button>
              </header>

              {/* Modal Body */}
              <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
                <LobbySearch
                  roomId={roomId}
                  onVideoSelected={roomHook.changeVideo}
                  onClose={() => setIsMediaSwitcherOpen(false)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
