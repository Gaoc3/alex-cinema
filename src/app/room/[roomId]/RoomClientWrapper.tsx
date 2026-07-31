'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { updateRoomTitle } from '@/app/actions/room.actions';
import LobbySearch from './LobbySearch';
import UserAvatar from '@/components/UserAvatar';

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
}

function RoomStateScreen({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-[#070a11] p-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d121d] p-7 text-center shadow-2xl sm:p-10">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-2xl text-red-400">
          <i className={icon} aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-2xl font-black">{title}</h1>
        <p className="mb-7 text-sm leading-7 text-slate-300">{description}</p>
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 cursor-pointer rounded-xl bg-[#e50914] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          {actionLabel}
        </button>
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

  const handleShareRoom = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && window.matchMedia('(max-width: 1023px)').matches) {
        await navigator.share({ title: roomData.title || 'غرفة أليكس سينما', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط الغرفة');
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

  if (!isLoaded) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#070a11]" role="status" aria-label="جارٍ تحميل الغرفة">
        <div className="size-11 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (roomHook.isKicked) {
    return (
      <RoomStateScreen
        icon="fa-solid fa-ban"
        title="تم إخراجك من الغرفة"
        description="أنهى المضيف مشاركتك في جلسة المشاهدة الحالية."
        actionLabel="تصفح المحتوى"
        onAction={() => router.push('/movies')}
      />
    );
  }

  if (roomHook.isRoomClosed) {
    return (
      <RoomStateScreen
        icon="fa-solid fa-door-closed"
        title="انتهت جلسة المشاهدة"
        description="أغلق المضيف هذه الغرفة. يمكنك الانضمام إلى جلسة أخرى من صفحة الغرف."
        actionLabel="عرض الغرف النشطة"
        onAction={() => router.push('/rooms')}
      />
    );
  }

  const bgImage = video ? getVideoImageUrl(video) : null;
  const visibleMembers = roomHook.members.slice(0, 3);
  const memberCount = Math.max(roomHook.members.length, 1);

  const [displayTitle, setDisplayTitle] = useState(roomData.title || 'غرفة المشاهدة');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(displayTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSavingTitle) return;
    setIsSavingTitle(true);
    try {
      const res = await updateRoomTitle(roomId, newTitle.trim());
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
    <div className="relative min-h-[100svh] overflow-x-clip bg-[#070a11] text-white" dir="rtl">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {bgImage && (
          <div
            className="absolute inset-x-0 top-0 h-[55svh] bg-cover bg-center opacity-[0.09] blur-3xl"
            style={{ backgroundImage: `linear-gradient(to bottom, transparent, #070a11), url(${bgImage})` }}
          />
        )}
        <div className="absolute -right-32 top-20 size-80 rounded-full bg-red-700/10 blur-[110px]" />
        <div className="absolute -left-32 bottom-10 size-96 rounded-full bg-blue-700/10 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1920px] flex-col px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 lg:px-6">
        <header className="mb-3 flex min-h-14 items-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0b101a]/95 p-2 shadow-xl sm:mb-4 sm:p-2.5">
          <button
            type="button"
            onClick={() => router.push('/rooms')}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label="العودة إلى الغرف"
            title="العودة إلى الغرف"
          >
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 px-1">
            <div className="flex min-w-0 items-center gap-2">
              {isEditingTitle ? (
                <form
                  onSubmit={handleSaveTitle}
                  className="flex items-center gap-1.5 min-w-0 flex-1"
                >
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={50}
                    className="min-h-8 w-full min-w-0 rounded-lg border border-red-500/40 bg-black/40 px-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-red-500/30"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isSavingTitle}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                    title="حفظ الاسم"
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
                <>
                  <h1 className="truncate text-base font-black text-white sm:text-lg">
                    {displayTitle}
                  </h1>
                  {isHostUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle(displayTitle);
                        setIsEditingTitle(true);
                      }}
                      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition"
                      title="إعادة تسمية الغرفة"
                      aria-label="إعادة تسمية الغرفة"
                    >
                      <i className="fa-solid fa-pen text-xs" aria-hidden="true" />
                    </button>
                  )}
                  {roomData.isPrivate && (
                    <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                      <i className="fa-solid fa-lock ml-1" aria-hidden="true" />
                      خاصة
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2 overflow-hidden text-[11px] text-slate-400">
              <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-slate-300">
                <UserAvatar imageUrl={roomData.host?.imageUrl} name={roomData.host?.name} className="size-5 border border-white/15 text-[8px]" />
                <span className="max-w-24 truncate">المضيف: {roomData.host?.name || 'مستخدم أليكس'}</span>
              </span>
              <span className="h-3 w-px shrink-0 bg-white/10" aria-hidden="true" />
              <span className="inline-flex shrink-0 items-center gap-1.5 text-slate-300" aria-live="polite">
                <span className={`size-1.5 rounded-full ${connectionMeta.color}`} />
                <span className="hidden min-[380px]:inline">{connectionMeta.label}</span>
              </span>
              <span className="hidden truncate font-mono sm:inline" dir="ltr">{roomId.slice(0, 12)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={showMembersPanel}
            className="flex min-h-11 shrink-0 cursor-pointer items-center rounded-xl border border-white/10 bg-white/[0.05] px-2.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={`عرض أعضاء الغرفة، العدد ${memberCount}`}
          >
            <i className="fa-solid fa-users text-slate-300 min-[430px]:hidden" aria-hidden="true" />
            <span className="hidden -space-x-2 space-x-reverse min-[430px]:flex" aria-hidden="true">
              {visibleMembers.map((member) => (
                <UserAvatar key={member.id} imageUrl={member.avatarUrl} name={member.name} className="size-7 border-2 border-[#0b101a] text-[10px]" />
              ))}
            </span>
            <span className="mr-1.5 text-xs font-bold text-slate-200 min-[430px]:mr-2">{memberCount}</span>
          </button>

          <button
            type="button"
            onClick={handleShareRoom}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#e50914] text-white shadow-[0_8px_24px_rgba(229,9,20,0.25)] transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            aria-label="مشاركة رابط الغرفة"
            title="مشاركة الغرفة"
          >
            <i className="fa-solid fa-share-nodes" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" dir="ltr">
          <section className="min-w-0" dir="rtl">
            {!video ? (
              <div className="flex min-h-[min(46svh,26rem)] items-center justify-center rounded-2xl border border-white/10 bg-[#0b101a]/90 p-5 shadow-2xl sm:min-h-[min(56svh,34rem)] sm:p-9 lg:min-h-[min(68svh,42rem)]">
                <div className="w-full max-w-3xl text-center">
                  <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-2xl text-red-400">
                    <i className="fa-solid fa-film" aria-hidden="true" />
                  </div>
                  <h2 className="mb-2 text-2xl font-black sm:text-3xl">
                    {isHostUser ? 'اختر ما ستشاهدونه' : 'بانتظار اختيار المحتوى'}
                  </h2>
                  <p className="mx-auto mb-7 max-w-xl text-sm leading-7 text-slate-300">
                    {isHostUser
                      ? 'ابحث عن فيلم أو مسلسل، وسيظهر لجميع المشاركين فور اختياره.'
                      : 'سيبدأ العرض تلقائياً عندما يختار المضيف الفيلم أو الحلقة.'}
                  </p>
                  {isHostUser ? (
                    <LobbySearch roomId={roomId} onVideoSelected={roomHook.changeVideo} />
                  ) : (
                    <div className="flex justify-center gap-2" role="status" aria-label="بانتظار المضيف">
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="size-2.5 animate-bounce rounded-full bg-red-500" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-4">
                <RoomPlayerUI
                  video={video}
                  seasons={seasons}
                  episodes={episodes}
                  roomHook={roomHook}
                />

                {isHostUser && (
                  <details className="group rounded-2xl border border-white/10 bg-[#0b101a]/90 shadow-lg">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-extrabold marker:content-none sm:px-5">
                      <span className="flex items-center gap-2.5">
                        <i className="fa-solid fa-clapperboard text-red-400" aria-hidden="true" />
                        تغيير الفيلم أو الحلقة
                      </span>
                      <i className="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="border-t border-white/10 p-4 sm:p-5">
                      <LobbySearch roomId={roomId} onVideoSelected={roomHook.changeVideo} />
                    </div>
                  </details>
                )}
              </div>
            )}
          </section>

          <aside ref={sidebarPanelRef} className="min-w-0 scroll-mt-4 lg:sticky lg:top-4 lg:self-start" dir="rtl">
            <RoomSidebar
              roomId={roomId}
              initialPrivacy={roomData.isPrivate ?? false}
              members={roomHook.members}
              messages={roomHook.messages}
              connectionState={roomHook.connectionState}
              isChatHistoryLoaded={roomHook.isChatHistoryLoaded}
              sendChatMessage={roomHook.sendChatMessage}
              deleteChatMessage={roomHook.deleteChatMessage}
              currentUserId={currentUserId}
              isHost={isHostUser}
              kickUser={roomHook.kickUser}
              closeRoom={roomHook.closeRoom}
              activeTab={activeRoomTab}
              onActiveTabChange={setActiveRoomTab}
              onLeaveRoom={() => router.push('/rooms')}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
