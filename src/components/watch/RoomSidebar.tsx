'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import type { ChatMessage, RoomConnectionState, RoomMember } from '@/hooks/useWatchRoom';
import UserAvatar from '@/components/UserAvatar';

export type RoomTab = 'chat' | 'members' | 'settings';

interface RoomSidebarProps {
  roomId: string;
  initialPrivacy: boolean;
  members: RoomMember[];
  messages: ChatMessage[];
  connectionState: RoomConnectionState;
  isChatHistoryLoaded: boolean;
  sendChatMessage: (text: string, replyToId?: string) => Promise<{ ok: boolean; error?: string }>;
  deleteChatMessage: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
  currentUserId: string | null;
  isHost: boolean;
  kickUser: (socketId: string) => void;
  closeRoom: () => Promise<void>;
  activeTab: RoomTab;
  onActiveTabChange: (tab: RoomTab) => void;
  onLeaveRoom: () => void;
}

const CHAT_PREFERENCES_KEY = 'alex-cinema:room-chat-preferences:v1';
const NEAR_BOTTOM_THRESHOLD = 96;

function playTone(context: AudioContext) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startsAt = context.currentTime;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(660, startsAt);
  oscillator.frequency.exponentialRampToValueAtTime(880, startsAt + 0.12);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.08, startsAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + 0.2);
}

export default function RoomSidebar({
  roomId,
  initialPrivacy,
  members,
  messages,
  connectionState,
  isChatHistoryLoaded,
  sendChatMessage,
  deleteChatMessage,
  currentUserId,
  isHost,
  kickUser,
  closeRoom,
  activeTab,
  onActiveTabChange,
  onLeaveRoom,
}: RoomSidebarProps) {
  const [inputText, setInputText] = useState('');
  const [isPrivate, setIsPrivate] = useState(initialPrivacy);
  const [isToggling, setIsToggling] = useState(false);
  const [isClosingRoom, setIsClosingRoom] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCloseRoomModal, setShowCloseRoomModal] = useState(false);
  const [kickMemberTarget, setKickMemberTarget] = useState<RoomMember | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [compactChat, setCompactChat] = useState(false);
  const [notificationSound, setNotificationSound] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messageElementsRef = useRef(new Map<string, HTMLElement>());
  const actionButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const hasMessageBaselineRef = useRef(false);
  const seenMessageIdsRef = useRef(new Set<string>());
  const isNearBottomRef = useRef(true);
  const highlightTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const hosts = members.filter((member) => member.isHost);
  const viewers = members.filter((member) => !member.isHost);
  const connectionMeta = {
    connecting: { label: 'جارٍ الاتصال', color: 'bg-amber-400' },
    connected: { label: 'جلسة مباشرة', color: 'bg-emerald-400' },
    reconnecting: { label: 'إعادة الاتصال', color: 'bg-amber-400 motion-safe:animate-pulse' },
    offline: { label: 'غير متصل', color: 'bg-red-500' },
  }[connectionState];
  const currentReplyTarget = replyingTo
    ? messages.find((message) => message.id === replyingTo.id)
    : null;
  const activeReplyTarget = currentReplyTarget && !currentReplyTarget.isDeleted
    ? currentReplyTarget
    : null;
  const currentDeleteTarget = deleteMessageTarget
    ? messages.find((message) => message.id === deleteMessageTarget.id)
    : null;
  const activeDeleteTarget = currentDeleteTarget && !currentDeleteTarget.isDeleted
    ? currentDeleteTarget
    : null;

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    const AudioContextConstructor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    audioContextRef.current = new AudioContextConstructor();
    return audioContextRef.current;
  }, []);

  const playNotification = useCallback(() => {
    try {
      const context = getAudioContext();
      if (!context) return;
      if (context.state === 'suspended') void context.resume();
      playTone(context);
    } catch {
      // Browsers can block audio until the next user gesture.
    }
  }, [getAudioContext]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const panel = chatScrollRef.current;
    if (!panel) return;
    panel.scrollTo({ top: panel.scrollHeight, behavior });
    isNearBottomRef.current = true;
    setIsNearBottom(true);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(CHAT_PREFERENCES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { compactChat?: boolean; notificationSound?: boolean };
          setCompactChat(Boolean(parsed.compactChat));
          setNotificationSound(Boolean(parsed.notificationSound));
        }
      } catch {
        // Keep the defaults when storage is unavailable or malformed.
      } finally {
        setPreferencesLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem(CHAT_PREFERENCES_KEY, JSON.stringify({
        compactChat,
        notificationSound,
      }));
    } catch {
      // The preferences remain active for this session when storage is unavailable.
    }
  }, [compactChat, notificationSound, preferencesLoaded]);

  useEffect(() => {
    if (!notificationSound) return;
    const unlockAudio = () => {
      const context = getAudioContext();
      if (context?.state === 'suspended') void context.resume();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, [getAudioContext, notificationSound]);

  useEffect(() => () => {
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    if (audioContextRef.current) void audioContextRef.current.close();
  }, []);

  useEffect(() => {
    if (!openActionsId) return;
    const closeMenu = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('[data-chat-actions]')) {
        setOpenActionsId(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      actionButtonRefs.current.get(openActionsId)?.focus();
      setOpenActionsId(null);
    };
    const closeOnViewportChange = () => setOpenActionsId(null);
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [openActionsId]);

  useEffect(() => {
    if (!isChatHistoryLoaded) {
      hasMessageBaselineRef.current = false;
      seenMessageIdsRef.current.clear();
      return;
    }

    const latestMessage = messages.at(-1);
    if (!hasMessageBaselineRef.current) {
      hasMessageBaselineRef.current = true;
      seenMessageIdsRef.current = new Set(messages.map((message) => message.id));
      if (latestMessage && activeTab === 'chat') {
        const frame = window.requestAnimationFrame(() => scrollToLatest('auto'));
        return () => window.cancelAnimationFrame(frame);
      }
      return;
    }

    const newMessages = messages.filter((message) => !seenMessageIdsRef.current.has(message.id));
    for (const message of newMessages) seenMessageIdsRef.current.add(message.id);
    const newestMessage = newMessages.at(-1);
    if (!newestMessage) return;

    const isOwnMessage = currentUserId
      ? newestMessage.senderId === currentUserId
      : Boolean(!isHost && newestMessage.canDelete);

    if (activeTab === 'chat' && isNearBottomRef.current) {
      const frame = window.requestAnimationFrame(() => scrollToLatest('smooth'));
      if (notificationSound && !isOwnMessage) playNotification();
      return () => window.cancelAnimationFrame(frame);
    }

    setUnreadCount((count) => count + newMessages.length);
    if (notificationSound && !isOwnMessage) playNotification();
  }, [activeTab, currentUserId, isChatHistoryLoaded, isHost, messages, notificationSound, playNotification, scrollToLatest]);

  useEffect(() => {
    if (activeTab !== 'chat' || unreadCount > 0 || !isNearBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => scrollToLatest('auto'));
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, scrollToLatest, unreadCount]);

  const handleChatScroll = () => {
    const panel = chatScrollRef.current;
    if (!panel) return;
    const nearBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight <= NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    setIsNearBottom(nearBottom);
    if (nearBottom) setUnreadCount(0);
    if (openActionsId) setOpenActionsId(null);
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    try {
      const result = await sendChatMessage(inputText, activeReplyTarget?.id);
      if (result.ok) {
        setInputText('');
        setReplyingTo(null);
        onActiveTabChange('chat');
        window.requestAnimationFrame(() => scrollToLatest('smooth'));
      } else {
        toast.error(result.error || 'تعذر إرسال الرسالة');
      }
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ar-IQ', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const copyText = async (text: string, successMessage: string, errorMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error(errorMessage);
    }
  };

  const copyInviteLink = () => copyText(window.location.href, 'تم نسخ رابط الغرفة', 'تعذر نسخ الرابط');
  const copyRoomId = () => copyText(roomId, 'تم نسخ معرّف الغرفة', 'تعذر نسخ معرّف الغرفة');

  const copyMessage = (message: ChatMessage) => {
    setOpenActionsId(null);
    void copyText(message.text, 'تم نسخ الرسالة', 'تعذر نسخ الرسالة');
    window.requestAnimationFrame(() => actionButtonRefs.current.get(message.id)?.focus());
  };

  const beginReply = (message: ChatMessage) => {
    if (message.isDeleted) return;
    setOpenActionsId(null);
    setReplyingTo(message);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const toggleMessageActions = (message: ChatMessage) => {
    if (openActionsId === message.id) {
      setOpenActionsId(null);
      return;
    }

    const button = actionButtonRefs.current.get(message.id);
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    const menuWidth = 144;
    const estimatedHeight = canDeleteMessage(message) ? 148 : 104;
    const spaceBelow = window.innerHeight - bounds.bottom;
    const top = spaceBelow >= estimatedHeight + 12
      ? bounds.bottom + 4
      : Math.max(8, bounds.top - estimatedHeight - 4);
    const left = Math.min(
      window.innerWidth - menuWidth - 8,
      Math.max(8, bounds.right - menuWidth),
    );
    setActionMenuPosition({ top, left: Math.max(8, left) });
    setOpenActionsId(message.id);
  };

  const scrollToMessage = (messageId: string) => {
    const panel = chatScrollRef.current;
    const messageElement = messageElementsRef.current.get(messageId);
    if (!panel || !messageElement) {
      toast.error('الرسالة الأصلية ليست ضمن السجل الحالي');
      return;
    }

    const panelBounds = panel.getBoundingClientRect();
    const messageBounds = messageElement.getBoundingClientRect();
    const targetTop = panel.scrollTop
      + messageBounds.top
      - panelBounds.top
      - ((panel.clientHeight - messageElement.clientHeight) / 2);
    panel.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedMessageId(null), 1_600);
  };

  const canDeleteMessage = (message: ChatMessage) => Boolean(
    message.canDelete
    || isHost
    || (currentUserId && message.senderId === currentUserId),
  );

  const handleConfirmMessageDelete = async () => {
    const target = activeDeleteTarget;
    if (!target || deletingMessageId) return;
    setDeleteMessageTarget(null);
    setDeletingMessageId(target.id);
    const result = await deleteChatMessage(target.id);
    if (result.ok) {
      toast.success('تم حذف الرسالة');
      if (activeReplyTarget?.id === target.id) setReplyingTo(null);
      window.requestAnimationFrame(() => composerRef.current?.focus());
    } else {
      toast.error(result.error || 'تعذر حذف الرسالة');
    }
    setDeletingMessageId(null);
  };

  const handleTogglePrivacy = async () => {
    if (!isHost || isToggling) return;
    setIsToggling(true);
    try {
      const nextPrivacy = !isPrivate;
      const response = await fetch('/api/rooms/toggle-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, isPrivate: nextPrivacy }),
      });
      const result = await response.json();
      if (result.success) {
        setIsPrivate(nextPrivacy);
        toast.success(nextPrivacy ? 'أصبحت الغرفة خاصة' : 'أصبحت الغرفة عامة');
      } else {
        toast.error(result.error || 'فشل تغيير الخصوصية');
      }
    } catch {
      toast.error('تعذر تحديث إعدادات الغرفة');
    } finally {
      setIsToggling(false);
    }
  };

  const handleConfirmCloseRoom = async () => {
    setShowCloseRoomModal(false);
    if (!isHost || isClosingRoom) return;
    setIsClosingRoom(true);
    try {
      const response = await fetch('/api/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      const result = await response.json();
      if (result.success) {
        await closeRoom();
        toast.success('تم إغلاق الغرفة');
        onLeaveRoom();
      } else {
        toast.error(result.error || 'تعذر حذف الغرفة');
      }
    } catch {
      toast.error('تعذر حذف الغرفة');
    } finally {
      setIsClosingRoom(false);
    }
  };

  const handleConfirmKick = () => {
    if (!kickMemberTarget) return;
    kickUser(kickMemberTarget.id);
    setKickMemberTarget(null);
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const tabs: Array<{ id: RoomTab; label: string; icon: string; count?: number }> = [
    { id: 'chat', label: 'الدردشة', icon: 'fa-message', count: unreadCount || undefined },
    { id: 'members', label: 'الأعضاء', icon: 'fa-users', count: Math.max(members.length, 1) },
    { id: 'settings', label: 'الإعدادات', icon: 'fa-gear' },
  ];

  return (
    <>
      <ConfirmModal
        isOpen={showCloseRoomModal}
        onCancel={() => setShowCloseRoomModal(false)}
        onConfirm={() => void handleConfirmCloseRoom()}
        title="إغلاق الغرفة"
        message="سيخرج جميع المشاركين ولن يمكن استعادة هذه الجلسة. هل تريد المتابعة؟"
        confirmText="إغلاق الغرفة"
      />
      <ConfirmModal
        isOpen={Boolean(kickMemberTarget)}
        onCancel={() => setKickMemberTarget(null)}
        onConfirm={handleConfirmKick}
        title="إخراج مشارك"
        message={`هل تريد إخراج ${kickMemberTarget?.name || 'هذا المشارك'} من الغرفة؟`}
        confirmText="إخراج"
      />
      <ConfirmModal
        isOpen={Boolean(activeDeleteTarget)}
        onCancel={() => setDeleteMessageTarget(null)}
        onConfirm={() => void handleConfirmMessageDelete()}
        title="حذف الرسالة"
        message="ستظهر الرسالة كمحذوفة مع بقاء الردود المرتبطة بها. هل تريد المتابعة؟"
        confirmText="حذف الرسالة"
      />

      <section
        className="relative flex h-[clamp(26rem,60dvh,38rem)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b101a] shadow-2xl lg:h-[min(68dvh,42rem)] lg:min-h-[30rem] lg:max-h-[42rem]"
        aria-label="لوحة الغرفة"
      >
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white">مجلس الغرفة</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400" aria-live="polite">
              <span className={`size-1.5 rounded-full ${connectionMeta.color}`} aria-hidden="true" />
              {connectionMeta.label}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 font-mono text-[10px] text-slate-400" dir="ltr">
            {roomId.slice(0, 8)}
          </span>
        </header>

        <div className="grid grid-cols-3 gap-1 border-b border-white/10 bg-black/15 p-2" role="toolbar" aria-label="أدوات الغرفة">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => onActiveTabChange(tab.id)}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
            >
              <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-red-400' : ''}`} aria-hidden="true" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab.id === 'chat' ? 'bg-red-500 text-white' : 'bg-white/10'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
            id="room-panel-chat"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="relative min-h-0 flex-1 overflow-hidden bg-[#090e17]">
              <div
                ref={chatScrollRef}
                onScroll={handleChatScroll}
                role="log"
                aria-label="رسائل الغرفة"
                aria-live="polite"
                aria-relevant="additions text"
                aria-hidden={activeTab !== 'chat'}
                className={`custom-scrollbar absolute inset-0 overflow-y-auto px-3 py-3 sm:px-4 ${activeTab === 'chat' ? 'visible' : 'invisible pointer-events-none'}`}
              >
                {!isChatHistoryLoaded ? (
                  <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-6 text-center" role="status">
                    <span className="size-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" aria-hidden="true" />
                    <p className="text-xs font-bold text-slate-400">جارٍ تحميل المحادثة...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] text-lg text-slate-400">
                      <i className="fa-regular fa-comment-dots" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-bold text-slate-200">ابدأ المحادثة</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">ستبقى رسائل الغرفة ظاهرة عند إعادة تحميل الصفحة.</p>
                  </div>
                ) : (
                  <div className={compactChat ? 'space-y-2' : 'space-y-4'}>
                    {messages.map((message) => {
                      const canDelete = !message.isDeleted && canDeleteMessage(message);
                      const menuId = `message-actions-${message.id}`;
                      return (
                        <article
                          key={message.id}
                          ref={(element) => {
                            if (element) messageElementsRef.current.set(message.id, element);
                            else messageElementsRef.current.delete(message.id);
                          }}
                          className={`group scroll-m-4 rounded-xl transition ${highlightedMessageId === message.id ? 'bg-red-500/10 ring-2 ring-red-400/70' : ''}`}
                        >
                          <div className="mb-1 flex min-h-11 items-center justify-between gap-2 px-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <UserAvatar imageUrl={message.avatarUrl} name={message.sender} className="size-7 text-[10px]" />
                              <span className="truncate text-xs font-bold text-slate-200">{message.sender}</span>
                              {message.isHost && (
                                <span className="shrink-0 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                  مضيف
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <time className="text-[10px] text-slate-500" dateTime={message.createdAt}>
                                {formatMessageTime(message.createdAt)}
                              </time>
                              {!message.isDeleted && (
                                <div
                                  className="relative"
                                  data-chat-actions
                                  onBlur={(event) => {
                                    const nextTarget = event.relatedTarget;
                                    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                                      setOpenActionsId(null);
                                    }
                                  }}
                                >
                                  <button
                                    ref={(element) => {
                                      if (element) actionButtonRefs.current.set(message.id, element);
                                      else actionButtonRefs.current.delete(message.id);
                                    }}
                                    type="button"
                                    aria-label={`إجراءات رسالة ${message.sender}`}
                                    aria-haspopup="menu"
                                    aria-controls={menuId}
                                    aria-expanded={openActionsId === message.id}
                                    onClick={() => toggleMessageActions(message)}
                                    onKeyDown={(event) => {
                                      if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return;
                                      event.preventDefault();
                                      if (openActionsId !== message.id) toggleMessageActions(message);
                                      window.requestAnimationFrame(() => {
                                        document.querySelector<HTMLButtonElement>(`#${menuId} [role="menuitem"]`)?.focus();
                                      });
                                    }}
                                    className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                  >
                                    <i className="fa-solid fa-ellipsis" aria-hidden="true" />
                                  </button>
                                  {openActionsId === message.id && (
                                    <div
                                      id={menuId}
                                      role="menu"
                                      aria-label="إجراءات الرسالة"
                                      onKeyDown={handleMenuKeyDown}
                                      className="fixed z-50 w-36 overflow-hidden rounded-xl border border-white/10 bg-[#151c29] p-1.5 shadow-2xl"
                                      style={actionMenuPosition}
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => beginReply(message)}
                                        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-right text-xs font-bold text-slate-200 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                      >
                                        <i className="fa-solid fa-reply text-slate-400" aria-hidden="true" />
                                        رد
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => copyMessage(message)}
                                        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-right text-xs font-bold text-slate-200 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                      >
                                        <i className="fa-regular fa-copy text-slate-400" aria-hidden="true" />
                                        نسخ
                                      </button>
                                      {canDelete && (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={deletingMessageId === message.id}
                                          onClick={() => {
                                            actionButtonRefs.current.get(message.id)?.focus();
                                            setOpenActionsId(null);
                                            setDeleteMessageTarget(message);
                                          }}
                                          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-right text-xs font-bold text-red-300 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          <i className="fa-regular fa-trash-can" aria-hidden="true" />
                                          حذف
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className={`mr-9 max-w-[calc(100%-2.25rem)] break-words rounded-2xl rounded-tr-md border px-3.5 text-[13px] text-slate-100 ${compactChat ? 'py-2 leading-5' : 'py-2.5 leading-6'} ${message.isDeleted ? 'border-white/[0.05] bg-white/[0.025]' : 'border-white/[0.07] bg-white/[0.055]'}`}>
                            {message.replyTo && (
                              <button
                                type="button"
                                onClick={() => scrollToMessage(message.replyTo!.id)}
                                className="mb-2 flex min-h-11 w-full cursor-pointer flex-col justify-center rounded-xl border-r-2 border-red-500 bg-black/20 px-3 py-1.5 text-right transition hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                aria-label={`الانتقال إلى رسالة ${message.replyTo.sender}`}
                              >
                                <span className="text-[10px] font-extrabold text-red-300">{message.replyTo.sender}</span>
                                <span className="line-clamp-1 text-[11px] text-slate-400" dir="auto">
                                  {message.replyTo.isDeleted ? 'رسالة محذوفة' : message.replyTo.text}
                                </span>
                              </button>
                            )}
                            {message.isDeleted ? (
                              <p className="flex min-h-6 items-center gap-2 text-xs italic text-slate-500">
                                <i className="fa-solid fa-ban text-[10px]" aria-hidden="true" />
                                تم حذف هذه الرسالة
                              </p>
                            ) : (
                              <p className="whitespace-pre-wrap" dir="auto">{message.text}</p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeTab === 'chat' && (!isNearBottom || unreadCount > 0) && (
                <button
                  type="button"
                  onClick={() => scrollToLatest('smooth')}
                  className="absolute bottom-3 left-1/2 z-20 flex min-h-11 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#202938] px-4 text-xs font-extrabold text-white shadow-xl transition hover:bg-[#2a3546] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label={unreadCount ? `الانتقال إلى أحدث الرسائل، ${unreadCount} غير مقروءة` : 'الانتقال إلى أحدث الرسائل'}
                >
                  <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                  {unreadCount ? `${unreadCount} جديدة` : 'أحدث الرسائل'}
                </button>
              )}

              {activeTab === 'members' && (
                <section
                  id="room-panel-members"
                  className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-[#0b111c]"
                  role="region"
                  aria-label="المشاركون الآن"
                >
                  <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white">المشاركون الآن</h3>
                      <p className="mt-0.5 text-[10px] text-slate-500">أعضاء جلسة المشاهدة المتصلون</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                      {Math.max(members.length, 1)} متصل
                    </span>
                  </header>

                  <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-gutter:stable] sm:px-4">
                    {members.length === 0 ? (
                      <div className="flex h-full min-h-36 flex-col items-center justify-center px-6 text-center">
                        <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/[0.05] text-slate-400">
                          <i className="fa-solid fa-user-clock" aria-hidden="true" />
                        </span>
                        <p className="text-xs font-bold text-slate-300">جارٍ تحديث قائمة الأعضاء...</p>
                      </div>
                    ) : (
                      [...hosts, ...viewers].map((member) => (
                        <div key={member.id} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-11 shrink-0 items-center justify-center">
                              <UserAvatar
                                imageUrl={member.avatarUrl}
                                name={member.name}
                                className={`size-10 text-xs ring-offset-2 ring-offset-[#111824] ${member.isHost ? 'ring-2 ring-amber-400/70' : ''}`}
                              />
                              {member.isHost && (
                                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-300 text-[8px] text-amber-950 ring-2 ring-[#111824]">
                                  <i className="fa-solid fa-crown" aria-hidden="true" />
                                </span>
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-100">{member.name}</p>
                              <p className="mt-0.5 text-[10px] text-slate-500">{member.isHost ? 'المضيف' : 'مشاهد'}</p>
                            </div>
                          </div>
                          {isHost && !member.isHost && (
                            <button
                              type="button"
                              onClick={() => setKickMemberTarget(member)}
                              className="min-h-11 shrink-0 cursor-pointer rounded-xl px-3 text-xs font-bold text-red-300 transition hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            >
                              إخراج
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {activeTab === 'settings' && (
                <section
                  id="room-panel-settings"
                  className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-[#0b111c]"
                  role="region"
                  aria-label="إعدادات الغرفة"
                >
                  <header className="flex min-h-12 shrink-0 items-center border-b border-white/[0.08] px-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white">إعدادات الغرفة</h3>
                      <p className="mt-0.5 text-[10px] text-slate-500">تفضيلات الجلسة وإدارتها</p>
                    </div>
                  </header>

                  <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-gutter:stable]">
                    <button
                      type="button"
                      onClick={() => void copyInviteLink()}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 text-right transition hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white">دعوة الأصدقاء</span>
                        <span className="mt-1 block text-[11px] text-slate-400">نسخ رابط الغرفة</span>
                      </span>
                      <i className="fa-solid fa-link shrink-0 text-red-400" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void copyRoomId()}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 text-right transition hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white">معرّف الغرفة</span>
                        <span className="mt-1 block truncate font-mono text-[11px] text-slate-400" dir="ltr">{roomId}</span>
                      </span>
                      <i className="fa-regular fa-copy shrink-0 text-red-400" aria-hidden="true" />
                    </button>

                    <div className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">دردشة مدمجة</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">تقليل المسافات بين الرسائل</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={compactChat}
                        onClick={() => setCompactChat((value) => !value)}
                        className="group flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111c]"
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none relative h-7 w-12 rounded-full border shadow-inner transition-colors duration-200 ${compactChat ? 'border-red-400/40 bg-red-600' : 'border-white/10 bg-slate-700'}`}
                        >
                          <span className={`absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out ${compactChat ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                        <span className="sr-only">تبديل كثافة الدردشة</span>
                      </button>
                    </div>

                    <div className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">صوت إشعارات الدردشة</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">تنبيه صوتي للرسائل الجديدة</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notificationSound}
                        onClick={() => {
                          setNotificationSound((value) => {
                            if (!value) {
                              const context = getAudioContext();
                              if (context?.state === 'suspended') void context.resume();
                            }
                            return !value;
                          });
                        }}
                        className="group flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111c]"
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none relative h-7 w-12 rounded-full border shadow-inner transition-colors duration-200 ${notificationSound ? 'border-red-400/40 bg-red-600' : 'border-white/10 bg-slate-700'}`}
                        >
                          <span className={`absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out ${notificationSound ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                        <span className="sr-only">تبديل صوت إشعارات الدردشة</span>
                      </button>
                    </div>

                    <div className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">غرفة خاصة</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">إخفاؤها من قائمة الغرف العامة</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        onClick={handleTogglePrivacy}
                        disabled={!isHost || isToggling}
                        aria-checked={isPrivate}
                        aria-label="تبديل خصوصية الغرفة"
                        className="group flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111c] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none relative h-7 w-12 rounded-full border shadow-inner transition-colors duration-200 ${isPrivate ? 'border-red-400/40 bg-red-600' : 'border-white/10 bg-slate-700'}`}
                        >
                          <span className={`absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                      </button>
                    </div>

                    {!isHost && (
                      <p className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 text-xs leading-5 text-slate-400">
                        إعدادات الخصوصية وإدارة المشاركين متاحة للمضيف فقط.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={onLeaveRoom}
                      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-extrabold text-slate-200 transition hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
                      مغادرة الغرفة
                    </button>

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => setShowCloseRoomModal(true)}
                        disabled={isClosingRoom}
                        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-extrabold text-red-300 transition hover:border-red-500/40 hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <i className="fa-solid fa-trash-can" aria-hidden="true" />
                        {isClosingRoom ? 'جارٍ الإغلاق...' : 'إغلاق الغرفة'}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>

            {activeTab === 'chat' && (
              <form
                onSubmit={handleSendMessage}
                className="shrink-0 border-t border-white/10 bg-[#0d131f] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              >
              {activeReplyTarget && (
                <div className="mb-2 flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] pr-3">
                  <i className="fa-solid fa-reply shrink-0 text-xs text-red-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-extrabold text-red-300">رد على {activeReplyTarget.sender}</p>
                    <p className="truncate text-[11px] text-slate-400" dir="auto">{activeReplyTarget.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label="إلغاء الرد"
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={composerRef}
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  maxLength={1000}
                  rows={1}
                  placeholder="اكتب رسالة..."
                  aria-label="رسالة الدردشة"
                  className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.055] px-3.5 py-3 text-[13px] leading-5 text-white outline-none placeholder:text-slate-500 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#e50914] text-white transition hover:bg-red-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={isSending ? 'جارٍ إرسال الرسالة' : 'إرسال الرسالة'}
                >
                  <i className={`fa-solid ${isSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} aria-hidden="true" />
                </button>
              </div>
              </form>
            )}
          </div>

      </section>
    </>
  );
}
