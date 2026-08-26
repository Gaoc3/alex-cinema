'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import type { ChatMessage, MemberPermissions, RoomConnectionState, RoomMember } from '@/hooks/useWatchRoom';
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
  editChatMessage: (messageId: string, text: string) => Promise<{ ok: boolean; error?: string }>;
  deleteChatMessage: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
  currentUserId: string | null;
  isHost: boolean;
  userRole?: 'host' | 'moderator' | 'member';
  userPermissions?: MemberPermissions;
  setModeratorPermissions: (targetSocketId: string, permissions: MemberPermissions) => Promise<{ ok: boolean; error?: string }>;
  removeModerator: (targetSocketId: string) => Promise<{ ok: boolean; error?: string }>;
  kickUser: (targetSocketId: string) => Promise<{ ok: boolean; error?: string }>;
  banUser: (targetSocketId: string) => Promise<{ ok: boolean; error?: string }>;
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
  editChatMessage,
  deleteChatMessage,
  currentUserId,
  isHost,
  userRole = 'member',
  userPermissions = { canKick: false, canBan: false, canSeek: false, canChangeMedia: false },
  setModeratorPermissions,
  removeModerator,
  kickUser,
  banUser,
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
  const [banMemberTarget, setBanMemberTarget] = useState<RoomMember | null>(null);
  const [modPermissionsTarget, setModPermissionsTarget] = useState<RoomMember | null>(null);
  const [permissionsState, setPermissionsState] = useState<MemberPermissions>({
    canKick: false,
    canBan: false,
    canSeek: true,
    canChangeMedia: false,
  });

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
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

  const uniqueMembers = React.useMemo(() => {
    const seen = new Map<string, RoomMember>();
    for (const member of members) {
      const key = (member as any).userId || (member as any).identity || member.name || member.id;
      if (!seen.has(key) || member.isHost) {
        seen.set(key, member);
      }
    }
    return Array.from(seen.values());
  }, [members]);

  const hosts = uniqueMembers.filter((member) => member.isHost);
  const moderators = uniqueMembers.filter((member) => !member.isHost && member.role === 'moderator');
  const viewers = uniqueMembers.filter((member) => !member.isHost && member.role !== 'moderator');

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
      // Audio playback blocked until user gesture
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
        // Fallback to default
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
      // Preferences active for current session
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
      if (editingMessage) {
        const result = await editChatMessage(editingMessage.id, inputText);
        if (result.ok) {
          setInputText('');
          setEditingMessage(null);
          toast.success('تم تعديل الرسالة');
        } else {
          toast.error(result.error || 'تعذر تعديل الرسالة');
        }
      } else {
        const result = await sendChatMessage(inputText, activeReplyTarget?.id);
        if (result.ok) {
          setInputText('');
          setReplyingTo(null);
          onActiveTabChange('chat');
          window.requestAnimationFrame(() => scrollToLatest('smooth'));
        } else {
          toast.error(result.error || 'تعذر إرسال الرسالة');
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const beginEditMessage = (message: ChatMessage) => {
    if (message.isDeleted) return;
    setOpenActionsId(null);
    setReplyingTo(null);
    setEditingMessage(message);
    setInputText(message.text);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
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
    setEditingMessage(null);
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
    const isOwner = Boolean(currentUserId && message.senderId === currentUserId);
    const canDelete = canDeleteMessage(message);
    let estimatedHeight = 104;
    if (isOwner) estimatedHeight += 44;
    if (canDelete) estimatedHeight += 44;

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

  const isMessageOwner = (message: ChatMessage) => Boolean(
    currentUserId && message.senderId === currentUserId,
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
      if (editingMessage?.id === target.id) setEditingMessage(null);
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

  const handleConfirmKick = async () => {
    if (!kickMemberTarget) return;
    const result = await kickUser(kickMemberTarget.id);
    if (result.ok) toast.success(`تم طرد ${kickMemberTarget.name}`);
    else toast.error(result.error || 'تعذر طرد العضو');
    setKickMemberTarget(null);
  };

  const handleConfirmBan = async () => {
    if (!banMemberTarget) return;
    const result = await banUser(banMemberTarget.id);
    if (result.ok) toast.success(`تم حظر ${banMemberTarget.name} نهائياً`);
    else toast.error(result.error || 'تعذر حظر العضو');
    setBanMemberTarget(null);
  };

  const openModPermissionsModal = (member: RoomMember) => {
    setModPermissionsTarget(member);
    setPermissionsState(
      member.permissions || { canKick: false, canBan: false, canSeek: true, canChangeMedia: false },
    );
  };

  const handleSaveModeratorPermissions = async () => {
    if (!modPermissionsTarget) return;
    const result = await setModeratorPermissions(modPermissionsTarget.id, permissionsState);
    if (result.ok) {
      toast.success(`تم تحديث صلاحيات المشرف ${modPermissionsTarget.name}`);
      setModPermissionsTarget(null);
    } else {
      toast.error(result.error || 'تعذر تحديث الصلاحيات');
    }
  };

  const handleRemoveModeratorRole = async (member: RoomMember) => {
    const result = await removeModerator(member.id);
    if (result.ok) {
      toast.success(`تم تجريد ${member.name} من الإشراف`);
    } else {
      toast.error(result.error || 'تعذر تجريد العضو من الإشراف');
    }
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
    { id: 'members', label: 'الأعضاء', icon: 'fa-users', count: Math.max(uniqueMembers.length, 1) },
    { id: 'settings', label: 'الإعدادات', icon: 'fa-gear' },
  ];

  const canManageMembers = isHost || userPermissions.canKick || userPermissions.canBan;

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
        onConfirm={() => void handleConfirmKick()}
        title="طرد مشارك من الغرفة"
        message={`هل تريد طرد ${kickMemberTarget?.name || 'هذا المشارك'} من الغرفة؟ سيمكنه العودة مجدداً عند استخدام الرابط.`}
        confirmText="طرد فقط"
      />
      <ConfirmModal
        isOpen={Boolean(banMemberTarget)}
        onCancel={() => setBanMemberTarget(null)}
        onConfirm={() => void handleConfirmBan()}
        title="حظر أبدي من الغرفة"
        message={`هل أنت مقتنع برغبتك في حظر ${banMemberTarget?.name || 'هذا العضو'} نهائياً من هذه الغرفة؟ لن يتمكن من إعادة الدخول مستقبلاً إطلاقاً.`}
        confirmText="تأكيد الحظر الأبدي"
      />
      <ConfirmModal
        isOpen={Boolean(activeDeleteTarget)}
        onCancel={() => setDeleteMessageTarget(null)}
        onConfirm={() => void handleConfirmMessageDelete()}
        title="حذف الرسالة"
        message="ستظهر الرسالة كمحذوفة مع بقاء الردود المرتبطة بها. هل تريد المتابعة؟"
        confirmText="حذف الرسالة"
      />

      {/* Permissions Modal for Host */}
      {modPermissionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] p-5 shadow-2xl">
            <header className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-white">إدارة صلاحيات المشرف</h3>
                <p className="mt-0.5 text-xs text-slate-400">{modPermissionsTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setModPermissionsTarget(null)}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-3 py-2">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10 select-none">
                <span className="text-xs font-bold text-slate-200">صلاحية طرد الأعضاء (Kick)</span>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
                  aria-checked={permissionsState.canKick}
                  onClick={() => setPermissionsState((prev) => ({ ...prev, canKick: !prev.canKick }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    permissionsState.canKick ? 'bg-[#e50914]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      permissionsState.canKick ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10 select-none">
                <span className="text-xs font-bold text-slate-200">صلاحية حظر الأعضاء أبداً (Ban Forever)</span>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
                  aria-checked={permissionsState.canBan}
                  onClick={() => setPermissionsState((prev) => ({ ...prev, canBan: !prev.canBan }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    permissionsState.canBan ? 'bg-[#e50914]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      permissionsState.canBan ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10 select-none">
                <span className="text-xs font-bold text-slate-200">التحكم بالتقديم والتأخير (Seek / Playback)</span>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
                  aria-checked={permissionsState.canSeek}
                  onClick={() => setPermissionsState((prev) => ({ ...prev, canSeek: !prev.canSeek }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    permissionsState.canSeek ? 'bg-[#e50914]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      permissionsState.canSeek ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10 select-none">
                <span className="text-xs font-bold text-slate-200">تغيير الفيلم أو الحلقة (Change Media)</span>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
                  aria-checked={permissionsState.canChangeMedia}
                  onClick={() => setPermissionsState((prev) => ({ ...prev, canChangeMedia: !prev.canChangeMedia }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    permissionsState.canChangeMedia ? 'bg-[#e50914]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      permissionsState.canChangeMedia ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            <footer className="mt-5 flex gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => void handleSaveModeratorPermissions()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
              >
                حفظ الصلاحيات
              </button>
              <button
                type="button"
                onClick={() => setModPermissionsTarget(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                إلغاء
              </button>
            </footer>
          </div>
        </div>
      )}

      <section
        className={`relative flex w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1d]/85 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all ${
          activeTab === 'chat'
            ? 'h-[clamp(28rem,70dvh,42rem)] min-h-[28rem]'
            : 'h-auto min-h-0'
        } lg:h-[min(68dvh,42rem)] lg:min-h-[30rem] lg:max-h-[42rem]`}
        aria-label="مجلس الغرفة"
      >
        {/* Lounge Header */}
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 bg-white/[0.02]">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white tracking-wide">مجلس الغرفة</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400" aria-live="polite">
              <span className={`size-1.5 rounded-full ${connectionMeta.color}`} aria-hidden="true" />
              <span className="font-medium">{connectionMeta.label}</span>
            </p>
          </div>
          <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-slate-400" dir="ltr">
            {roomId.slice(0, 8)}
          </span>
        </header>

        {/* Segmented Tab Selector */}
        <div className="grid grid-cols-3 gap-1 shrink-0 border-b border-white/10 bg-black/25 p-1.5" role="toolbar" aria-label="أدوات الغرفة">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => onActiveTabChange(tab.id)}
              className={`flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs`} aria-hidden="true" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-mono ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: CHAT */}
        {activeTab === 'chat' && (
          <div id="room-panel-chat" className="flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070b14]/70">
              <div
                ref={chatScrollRef}
                onScroll={handleChatScroll}
                role="log"
                aria-label="رسائل الغرفة"
                aria-live="polite"
                aria-relevant="additions text"
                className="custom-scrollbar absolute inset-0 overflow-y-auto px-3 py-3 sm:px-4"
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
                      const isOwner = !message.isDeleted && isMessageOwner(message);
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
                            <div className="flex shrink-0 items-center gap-1.5">
                              {message.isEdited && !message.isDeleted && (
                                <span className="text-[10px] font-extrabold text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded">مُعدّلة</span>
                              )}
                              <time className="text-[10px] text-slate-500" dateTime={message.createdAt}>
                                {formatMessageTime(message.createdAt)}
                              </time>
                              {(isOwner || canDelete) && (
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
                                    ref={(el) => {
                                      if (el) actionButtonRefs.current.set(message.id, el);
                                      else actionButtonRefs.current.delete(message.id);
                                    }}
                                    type="button"
                                    aria-label={`إجراءات رسالة ${message.sender}`}
                                    aria-haspopup="menu"
                                    aria-controls={menuId}
                                    aria-expanded={openActionsId === message.id}
                                    onClick={() => toggleMessageActions(message)}
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
                                      {isOwner && (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => beginEditMessage(message)}
                                          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-right text-xs font-bold text-amber-300 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                        >
                                          <i className="fa-solid fa-pen text-amber-400" aria-hidden="true" />
                                          تعديل
                                        </button>
                                      )}
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

              {(!isNearBottom || unreadCount > 0) && (
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
            </div>

            {/* Chat Composer Form */}
            <form
              onSubmit={handleSendMessage}
              className="shrink-0 border-t border-white/10 bg-[#0d131f] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              {editingMessage ? (
                <div className="mb-2 flex min-h-11 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 pr-3">
                  <i className="fa-solid fa-pen shrink-0 text-xs text-amber-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-extrabold text-amber-300">تعديل الرسالة</p>
                    <p className="truncate text-[11px] text-slate-400" dir="auto">{editingMessage.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label="إلغاء التعديل"
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              ) : activeReplyTarget ? (
                <div className="mb-2 flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] pr-3">
                  <i className="fa-solid fa-reply shrink-0 text-xs text-red-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-extrabold text-red-300">رد على {activeReplyTarget.sender}</p>
                    <p className="truncate text-[11px] text-slate-400" dir="auto">{activeReplyTarget.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label="إلغاء الرد"
                  >
                    <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              {/* Quick Reactions Bar */}
              <div className="mb-2 flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/30 px-2.5 py-1.5 backdrop-blur-md">
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                  <i className="fa-solid fa-bolt-lightning text-amber-400" aria-hidden="true" />
                  <span>تفاعل سريع:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {['🍿', '🔥', '❤️', '👏', '😂', '😱'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={isSending}
                      onClick={async () => {
                        if (isSending) return;
                        setIsSending(true);
                        try {
                          const ok = await sendChatMessage(emoji, null);
                          if (ok) scrollToLatest();
                        } finally {
                          setIsSending(false);
                        }
                      }}
                      className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-white/[0.04] text-xs transition-all hover:scale-125 hover:bg-white/10 active:scale-95 disabled:opacity-40"
                      title={`إرسال ${emoji}`}
                      aria-label={`تفاعل سريع ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

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
                  placeholder={editingMessage ? 'أدخل الرسالة المعدلة...' : 'اكتب رسالة في المجلس...'}
                  aria-label="رسالة الدردشة"
                  className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-xs sm:text-sm leading-5 text-white outline-none placeholder:text-slate-500 transition-all focus:border-red-500 focus:bg-black/60 focus:ring-4 focus:ring-red-500/15"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-white shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-30 ${
                    editingMessage 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30' 
                      : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                  }`}
                  aria-label={isSending ? 'جارٍ الإرسال' : editingMessage ? 'حفظ التعديل' : 'إرسال الرسالة'}
                >
                  <i className={`fa-solid text-sm ${isSending ? 'fa-spinner fa-spin' : editingMessage ? 'fa-check' : 'fa-paper-plane'}`} aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'members' && (
          <div
            id="room-panel-members"
            className="flex flex-col bg-[#0b111c] p-3 sm:p-4 space-y-2.5 overflow-y-auto max-h-[36rem] lg:max-h-full"
            role="region"
            aria-label="المشاركون الآن"
          >
            {uniqueMembers.length === 0 ? (
              <div className="flex min-h-36 flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/[0.05] text-slate-400">
                  <i className="fa-solid fa-user-clock" aria-hidden="true" />
                </span>
                <p className="text-xs font-bold text-slate-300">جارٍ تحديث قائمة الأعضاء...</p>
              </div>
            ) : (
              [...hosts, ...moderators, ...viewers].map((member) => {
                const isMemberHost = member.isHost;
                const isMemberMod = member.role === 'moderator';

                return (
                  <div key={member.id} className="flex flex-col gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 transition hover:bg-white/[0.06]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="relative flex size-9 shrink-0 items-center justify-center">
                          <UserAvatar
                            imageUrl={member.avatarUrl}
                            name={member.name}
                            className={`size-9 text-xs ring-offset-2 ring-offset-[#111824] ${isMemberHost ? 'ring-2 ring-amber-400/70' : isMemberMod ? 'ring-2 ring-blue-400/70' : ''}`}
                          />
                          {isMemberHost ? (
                            <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-amber-300 text-[7px] text-amber-950 ring-2 ring-[#111824]">
                              <i className="fa-solid fa-crown" aria-hidden="true" />
                            </span>
                          ) : isMemberMod ? (
                            <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-blue-400 text-[7px] text-blue-950 ring-2 ring-[#111824]">
                              <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                            </span>
                          ) : null}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-100">{member.name}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                            {isMemberHost ? 'المضيف' : isMemberMod ? 'مشرف الغرفة' : 'مشاهد'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!isMemberHost && (canManageMembers || isHost) && (
                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-white/[0.06]">
                        {isHost && (
                          <>
                            <button
                              type="button"
                              onClick={() => openModPermissionsModal(member)}
                              className="min-h-8 cursor-pointer rounded-lg border border-blue-400/20 bg-blue-500/10 px-2 text-[11px] font-bold text-blue-300 transition hover:bg-blue-500/20 active:scale-95"
                              title="إدارة صلاحيات المشرف"
                            >
                              {isMemberMod ? 'الصلاحيات' : 'ترقية لمشرف'}
                            </button>
                            {isMemberMod && (
                              <button
                                type="button"
                                onClick={() => void handleRemoveModeratorRole(member)}
                                className="min-h-8 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-bold text-slate-300 transition hover:bg-white/10 active:scale-95"
                                title="تجريد من الإشراف"
                              >
                                تجريد
                              </button>
                            )}
                          </>
                        )}

                        {canManageMembers && (
                          <>
                            {(isHost || userPermissions.canKick) && (
                              <button
                                type="button"
                                onClick={() => setKickMemberTarget(member)}
                                className="min-h-8 cursor-pointer rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20 active:scale-95"
                                title="طرد موقت من الغرفة"
                              >
                                طرد
                              </button>
                            )}
                            {(isHost || userPermissions.canBan) && (
                              <button
                                type="button"
                                onClick={() => setBanMemberTarget(member)}
                                className="min-h-8 cursor-pointer rounded-lg border border-red-500/25 bg-red-500/15 px-2.5 text-[11px] font-bold text-red-300 transition hover:bg-red-500/25 active:scale-95"
                                title="حظر أبدي من الغرفة"
                              >
                                حظر أبدي
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: SETTINGS (CLEAN, MODERN, PIXEL-PERFECT GLASSMORPHIC) */}
        {activeTab === 'settings' && (
          <div
            id="room-panel-settings"
            className="flex flex-col bg-[#0b111c] p-3.5 sm:p-4 space-y-3.5 overflow-y-auto"
            role="region"
            aria-label="إعدادات الغرفة"
          >
            {/* Share & Copy Stack */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void copyInviteLink()}
                className="group flex w-full items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-red-500/30 transition-all cursor-pointer text-right"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 text-sm group-hover:scale-105 group-hover:bg-red-500/20 transition-all">
                    <i className="fa-solid fa-link" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs sm:text-sm font-bold text-white">دعوة الأصدقاء</span>
                    <span className="block text-[11px] text-slate-400 truncate">نسخ الرابط المباشر للغرفة</span>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-extrabold text-red-300 bg-red-500/15 px-2.5 py-1.5 rounded-lg border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">
                  نسخ
                </span>
              </button>

              <button
                type="button"
                onClick={() => void copyRoomId()}
                className="group flex w-full items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all cursor-pointer text-right"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300 shrink-0 text-sm group-hover:scale-105 group-hover:bg-white/10 transition-all">
                    <i className="fa-regular fa-copy" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs sm:text-sm font-bold text-white">معرّف الغرفة</span>
                    <span className="block font-mono text-[11px] text-slate-400 truncate" dir="ltr">{roomId}</span>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-extrabold text-slate-300 bg-white/[0.06] px-2.5 py-1.5 rounded-lg border border-white/10 group-hover:bg-white/20 group-hover:text-white transition-all">
                  نسخ
                </span>
              </button>
            </div>

            {/* Preferences Switches Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
              {/* Compact Chat Toggle */}
              <div className="flex items-center justify-between p-3.5 gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-300 shrink-0 text-xs">
                    <i className="fa-solid fa-compress" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white">دردشة مدمجة</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">تقليل المسافات بين الرسائل</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
                  aria-checked={compactChat}
                  onClick={() => setCompactChat((value) => !value)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    compactChat ? 'bg-[#e50914]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      compactChat ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Notifications Toggle */}
              <div className="flex items-center justify-between p-3.5 gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-300 shrink-0 text-xs">
                    <i className="fa-solid fa-bell" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white">صوت إشعارات الدردشة</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">تنبيه صوتي للرسائل الجديدة</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
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
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    notificationSound ? 'bg-[#e50914]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      notificationSound ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Private Room Toggle (Host Only) */}
              <div className="flex items-center justify-between p-3.5 gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-300 shrink-0 text-xs">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white">غرفة خاصة</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">إخفاؤها من قائمة الغرف العامة</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
                  onClick={handleTogglePrivacy}
                  disabled={!isHost || isToggling}
                  aria-checked={isPrivate}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    isPrivate ? 'bg-[#e50914]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      isPrivate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {!isHost && (
              <p className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] leading-5 text-slate-400">
                <i className="fa-solid fa-circle-info ml-1.5 text-slate-500" aria-hidden="true" />
                إعدادات الخصوصية وإدارة المشاركين متاحة للمضيف فقط.
              </p>
            )}

            {/* Room Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="flex w-full items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-xs sm:text-sm font-bold text-slate-200 transition cursor-pointer active:scale-[0.99]"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-slate-400" aria-hidden="true" />
                <span>مغادرة الغرفة</span>
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={() => setShowCloseRoomModal(true)}
                  disabled={isClosingRoom}
                  className="flex w-full items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-xs sm:text-sm font-bold text-red-300 transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  <i className="fa-solid fa-trash-can text-red-400" aria-hidden="true" />
                  <span>{isClosingRoom ? 'جارٍ إغلاق الغرفة...' : 'إغلاق الغرفة'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
