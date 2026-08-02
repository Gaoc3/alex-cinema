import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RoomState {
  time: number;
  playing: boolean;
  lastUpdated: number;
  receivedAt?: number;
}

export type RoomConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface MemberPermissions {
  canKick: boolean;
  canBan: boolean;
  canSeek: boolean;
  canChangeMedia: boolean;
}

export interface RoomMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  isHost: boolean;
  role?: 'host' | 'moderator' | 'member';
  permissions?: MemberPermissions;
}

export interface ChatMessage {
  id: string;
  senderId: string | null;
  sender: string;
  avatarUrl: string | null;
  text: string;
  createdAt: string;
  isHost?: boolean;
  canDelete?: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  replyTo: {
    id: string;
    sender: string;
    text: string;
    isDeleted: boolean;
  } | null;
}

interface ChatSendResult {
  ok: boolean;
  error?: string;
  messageId?: string;
  deletedAt?: string;
}

export interface WatchRoomHook {
  connectionState: RoomConnectionState;
  isHost: boolean;
  userRole: 'host' | 'moderator' | 'member';
  userPermissions: MemberPermissions;
  roomState: RoomState | null;
  members: RoomMember[];
  messages: ChatMessage[];
  isChatHistoryLoaded: boolean;
  sendSyncUpdate: (time: number, playing: boolean) => void;
  changeVideo: (newVideoId: string, kind?: string, season?: string, episode?: string) => Promise<ChatSendResult>;
  changeEpisode: (episodeId: string, season?: string, episode?: string) => Promise<ChatSendResult>;
  setModeratorPermissions: (targetSocketId: string, permissions: MemberPermissions) => Promise<ChatSendResult>;
  removeModerator: (targetSocketId: string) => Promise<ChatSendResult>;
  kickUser: (targetSocketId: string) => Promise<ChatSendResult>;
  banUser: (targetSocketId: string) => Promise<ChatSendResult>;
  closeRoom: () => Promise<void>;
  sendChatMessage: (text: string, replyToId?: string) => Promise<ChatSendResult>;
  editChatMessage: (messageId: string, text: string) => Promise<ChatSendResult>;
  deleteChatMessage: (messageId: string) => Promise<ChatSendResult>;
  remoteVideoId: string | null;
  remoteEpisodeId: string | null;
  isKicked: boolean;
  isBanned: boolean;
  banReason: string | null;
  isRoomClosed: boolean;
  connectionError: string | null;
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...current, ...incoming]) {
    if (!message?.id) continue;
    const previous = byId.get(message.id);
    const isDeleted = Boolean(previous?.isDeleted || message.isDeleted);
    const isEdited = Boolean(previous?.isEdited || message.isEdited);
    byId.set(message.id, {
      ...previous,
      ...message,
      senderId: message.senderId ?? previous?.senderId ?? null,
      isDeleted,
      deletedAt: message.deletedAt ?? previous?.deletedAt ?? null,
      isEdited,
      editedAt: message.editedAt ?? previous?.editedAt ?? null,
      replyTo: message.replyTo ?? previous?.replyTo ?? null,
      text: isDeleted ? '' : message.text,
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => {
      const timeDifference = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return Number.isFinite(timeDifference) && timeDifference !== 0
        ? timeDifference
        : a.id.localeCompare(b.id);
    })
    .slice(-100);
}

function tombstoneMessage(
  messages: ChatMessage[],
  messageId: string,
  deletedAt: string,
) {
  return messages.map((message) => {
    const isDeletedMessage = message.id === messageId;
    const repliesToDeletedMessage = message.replyTo?.id === messageId;
    if (!isDeletedMessage && !repliesToDeletedMessage) return message;

    return {
      ...message,
      ...(isDeletedMessage ? { text: '', isDeleted: true, deletedAt } : {}),
      ...(repliesToDeletedMessage && message.replyTo
        ? {
            replyTo: {
              ...message.replyTo,
              text: '',
              isDeleted: true,
            },
          }
        : {}),
    };
  });
}

function applyKnownTombstones(
  messages: ChatMessage[],
  tombstones: Map<string, string>,
) {
  let updatedMessages = messages;
  for (const [messageId, deletedAt] of tombstones) {
    updatedMessages = tombstoneMessage(updatedMessages, messageId, deletedAt);
  }
  return updatedMessages;
}

function emitWithAcknowledgement(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
  timeoutMs = 6_000,
): Promise<ChatSendResult> {
  return new Promise((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, error: 'انتهت مهلة مزامنة الغرفة' });
      }
    }, timeoutMs);

    socket.emit(event, payload, (result: ChatSendResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result?.ok ? { ok: true } : { ok: false, error: result?.error || 'تعذرت مزامنة الغرفة' });
    });
  });
}

const DEFAULT_PERMISSIONS: MemberPermissions = {
  canKick: false,
  canBan: false,
  canSeek: false,
  canChangeMedia: false,
};

export function useWatchRoom(
  roomId: string,
  initIsHost: boolean,
  username: string,
  avatarUrl: string | null = null,
): WatchRoomHook {
  const [isHost, setIsHost] = useState(initIsHost);
  const [userRole, setUserRole] = useState<'host' | 'moderator' | 'member'>(initIsHost ? 'host' : 'member');
  const [userPermissions, setUserPermissions] = useState<MemberPermissions>(
    initIsHost
      ? { canKick: true, canBan: true, canSeek: true, canChangeMedia: true }
      : DEFAULT_PERMISSIONS,
  );
  const [connectionState, setConnectionState] = useState<RoomConnectionState>('connecting');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<RoomMember[]>(() => (
    username ? [{ id: 'self', name: username, avatarUrl, isHost: initIsHost, role: initIsHost ? 'host' : 'member' }] : []
  ));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatHistoryLoaded, setIsChatHistoryLoaded] = useState(false);
  const [remoteVideoId, setRemoteVideoId] = useState<string | null>(null);
  const [remoteEpisodeId, setRemoteEpisodeId] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const deletedMessageTombstonesRef = useRef(new Map<string, string>());
  const identityRef = useRef({ username, avatarUrl, initIsHost });

  useEffect(() => {
    identityRef.current = { username, avatarUrl, initIsHost };
  }, [username, avatarUrl, initIsHost]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    let refreshingToken = false;
    let terminalDisconnect = false;
    let authRefreshAttempts = 0;
    let authRetryTimer: number | null = null;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
      || (typeof window !== 'undefined' ? window.location.origin : '');

    const newSocket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = newSocket;
    deletedMessageTombstonesRef.current.clear();
    queueMicrotask(() => {
      if (!cancelled) {
        setMessages([]);
        setIsChatHistoryLoaded(false);
        setConnectionError(null);
        setConnectionState('connecting');
      }
    });

    const fetchToken = async () => {
      const response = await fetch('/api/realtime/token', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      const data = await response.json().catch(() => ({})) as { token?: string; error?: string };
      if (!response.ok || !data.token) throw new Error(data.error || 'تعذر بدء الاتصال المباشر');
      return data.token;
    };

    const connectWithFreshToken = async () => {
      if (refreshingToken || cancelled) return;
      refreshingToken = true;
      setConnectionState((current) => current === 'reconnecting' ? current : 'connecting');
      try {
        const token = await fetchToken();
        if (cancelled) return;
        newSocket.auth = { token };
        newSocket.connect();
      } catch (error) {
        if (!cancelled) {
          setConnectionState('offline');
          setConnectionError(error instanceof Error ? error.message : 'تعذر الاتصال بالغرفة');
        }
      } finally {
        refreshingToken = false;
      }
    };

    newSocket.on('connect', () => {
      setConnectionState('connecting');
      authRefreshAttempts = 0;
      if (authRetryTimer !== null) {
        window.clearTimeout(authRetryTimer);
        authRetryTimer = null;
      }
      setConnectionError(null);
      setMembers([{
        id: newSocket.id || 'self',
        name: identityRef.current.username || 'مشاهد',
        avatarUrl: identityRef.current.avatarUrl,
        isHost: identityRef.current.initIsHost,
        role: identityRef.current.initIsHost ? 'host' : 'member',
      }]);
      newSocket.emit('join_room', { roomId }, (result: ChatSendResult) => {
        if (result?.ok) {
          setConnectionState('connected');
          setConnectionError(null);
          return;
        }
        setConnectionState('offline');
        const errMsg = result?.error || 'تعذر دخول الغرفة';
        if (errMsg.includes('حظرك') || errMsg.includes('حظر') || errMsg.includes('BANNED')) {
          terminalDisconnect = true;
          setIsBanned(true);
          setBanReason(errMsg);
        } else if (errMsg.includes('طرد')) {
          terminalDisconnect = true;
          setIsKicked(true);
        } else {
          setConnectionError(errMsg);
        }
        newSocket.disconnect();
      });
    });

    newSocket.on('connect_error', (error) => {
      const message = error?.message || 'تعذر الاتصال بالغرفة';
      if (message === 'AUTH_EXPIRED') {
        setConnectionState('reconnecting');
        newSocket.disconnect();
        if (authRefreshAttempts >= 3) {
          setConnectionState('offline');
          setConnectionError('انتهت جلسة الاتصال، أعد تحميل الصفحة للمحاولة من جديد');
          return;
        }
        authRefreshAttempts += 1;
        const delay = 500 * (2 ** (authRefreshAttempts - 1));
        if (authRetryTimer !== null) window.clearTimeout(authRetryTimer);
        authRetryTimer = window.setTimeout(() => {
          authRetryTimer = null;
          void connectWithFreshToken();
        }, delay);
        return;
      }
      if (message === 'AUTH_INVALID' || message === 'AUTH_REQUIRED') {
        newSocket.disconnect();
        setConnectionState('offline');
        setConnectionError('تعذر التحقق من جلسة الغرفة، أعد تحميل الصفحة');
        return;
      }
      setConnectionState('reconnecting');
      setConnectionError(message);
    });

    newSocket.on('room_state', (data) => {
      const hostFlag = Boolean(data?.isHost);
      setIsHost(hostFlag);
      if (data?.role) setUserRole(data.role);
      else setUserRole(hostFlag ? 'host' : 'member');

      if (data?.permissions) {
        setUserPermissions(data.permissions);
      } else if (hostFlag) {
        setUserPermissions({ canKick: true, canBan: true, canSeek: true, canChangeMedia: true });
      } else {
        setUserPermissions(DEFAULT_PERMISSIONS);
      }

      setRemoteVideoId(typeof data?.videoId === 'string' ? data.videoId : null);
      setRemoteEpisodeId(typeof data?.episodeId === 'string' ? data.episodeId : null);
      if (data?.state) setRoomState({ ...data.state, receivedAt: Date.now() });
      if (Array.isArray(data?.members)) setMembers(data.members);
    });

    newSocket.on('permissions_updated', (data: { role: 'host' | 'moderator' | 'member'; permissions: MemberPermissions }) => {
      if (data?.role) setUserRole(data.role);
      if (data?.permissions) setUserPermissions(data.permissions);
    });

    newSocket.on('room_members', (updatedMembers: RoomMember[]) => {
      if (Array.isArray(updatedMembers)) setMembers(updatedMembers);
    });

    newSocket.on('sync_update', (state: RoomState) => {
      if (state && Number.isFinite(state.time)) {
        setRoomState({ ...state, receivedAt: Date.now() });
      }
    });

    newSocket.on('chat_history', (history: ChatMessage[]) => {
      if (Array.isArray(history)) {
        setMessages((current) => applyKnownTombstones(
          mergeMessages(current, history),
          deletedMessageTombstonesRef.current,
        ));
      }
      setIsChatHistoryLoaded(true);
    });

    newSocket.on('chat_message', (message: ChatMessage) => {
      if (message?.id) {
        setMessages((current) => applyKnownTombstones(
          mergeMessages(current, [message]),
          deletedMessageTombstonesRef.current,
        ));
      }
    });

    newSocket.on('chat_message_edited', (data: { messageId?: string; text?: string; editedAt?: string }) => {
      const messageId = data?.messageId;
      const text = data?.text;
      if (typeof messageId !== 'string' || typeof text !== 'string') return;
      const editedAt = typeof data.editedAt === 'string' ? data.editedAt : new Date().toISOString();
      setMessages((current) => current.map((msg) => {
        const isTarget = msg.id === messageId;
        const repliesToTarget = msg.replyTo?.id === messageId;
        if (!isTarget && !repliesToTarget) return msg;

        return {
          ...msg,
          ...(isTarget ? { text, isEdited: true, editedAt } : {}),
          ...(repliesToTarget && msg.replyTo ? { replyTo: { ...msg.replyTo, text } } : {}),
        };
      }));
    });

    newSocket.on('chat_message_deleted', (data: { messageId?: string; deletedAt?: string }) => {
      const messageId = data?.messageId;
      if (typeof messageId !== 'string') return;
      const deletedAt = typeof data.deletedAt === 'string'
        ? data.deletedAt
        : new Date().toISOString();
      deletedMessageTombstonesRef.current.set(messageId, deletedAt);
      setMessages((current) => tombstoneMessage(current, messageId, deletedAt));
    });

    newSocket.on('host_left', () => {
      setRoomState((current) => current ? { ...current, playing: false } : null);
    });

    newSocket.on('change_video', (data) => {
      if (data?.videoId) setRemoteVideoId(String(data.videoId));
      setRemoteEpisodeId(typeof data?.episodeId === 'string' ? data.episodeId : null);
    });

    newSocket.on('change_episode', (data) => {
      setRemoteEpisodeId(typeof data?.episodeId === 'string' ? data.episodeId : null);
    });

    newSocket.on('kicked', () => {
      terminalDisconnect = true;
      setConnectionState('offline');
      setIsKicked(true);
      newSocket.disconnect();
    });

    newSocket.on('banned', (data: { reason?: string }) => {
      terminalDisconnect = true;
      setConnectionState('offline');
      setIsBanned(true);
      setBanReason(data?.reason || 'تم حظرك نهائياً من هذه الغرفة');
      setConnectionError(data?.reason || 'تم حظرك نهائياً من هذه الغرفة');
      newSocket.disconnect();
    });

    newSocket.on('room_deleted', () => {
      terminalDisconnect = true;
      setConnectionState('offline');
      setIsRoomClosed(true);
      setConnectionError('تم إغلاق هذه الغرفة');
      newSocket.disconnect();
    });

    newSocket.on('disconnect', (reason) => {
      if (!cancelled && !terminalDisconnect) {
        setConnectionState(
          reason === 'io client disconnect' || reason === 'io server disconnect'
            ? 'offline'
            : 'reconnecting',
        );
      }
      if (!cancelled && !terminalDisconnect && reason === 'io server disconnect') {
        setConnectionError('أغلق الخادم اتصال الغرفة، أعد تحميل الصفحة للمحاولة مجدداً');
      }
    });

    void connectWithFreshToken();

    return () => {
      cancelled = true;
      if (authRetryTimer !== null) window.clearTimeout(authRetryTimer);
      newSocket.removeAllListeners();
      newSocket.disconnect();
      if (socketRef.current === newSocket) socketRef.current = null;
    };
  }, [roomId]);

  const sendSyncUpdate = useCallback((time: number, playing: boolean) => {
    if (socketRef.current?.connected && (isHost || userPermissions.canSeek)) {
      socketRef.current.emit('sync_update', { time, playing });
    }
  }, [isHost, userPermissions.canSeek]);

  const sendChatMessage = useCallback(async (
    rawText: string,
    replyToId?: string,
  ): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    const text = rawText.trim();
    if (!activeSocket?.connected) return { ok: false, error: 'الاتصال بالغرفة غير جاهز' };
    if (!text) return { ok: false, error: 'اكتب رسالة أولاً' };
    if (text.length > 1000) return { ok: false, error: 'الرسالة أطول من الحد المسموح' };

    return new Promise((resolve) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ ok: false, error: 'انتهت مهلة إرسال الرسالة' });
        }
      }, 8_000);

      activeSocket.emit('chat_send', {
        text,
        clientMessageId: crypto.randomUUID(),
        ...(replyToId ? { replyToId } : {}),
      }, (result: ChatSendResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(result?.ok ? { ok: true } : { ok: false, error: result?.error || 'تعذر إرسال الرسالة' });
      });
    });
  }, []);

  const editChatMessage = useCallback(async (messageId: string, rawText: string): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    const text = rawText.trim();
    if (!activeSocket?.connected) return { ok: false, error: 'الاتصال بالغرفة غير جاهز' };
    if (!messageId) return { ok: false, error: 'تعذر تعديل الرسالة' };
    if (!text) return { ok: false, error: 'اكتب الرسالة أولاً' };
    if (text.length > 1000) return { ok: false, error: 'الرسالة أطول من الحد المسموح' };

    return new Promise((resolve) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ ok: false, error: 'انتهت مهلة تعديل الرسالة' });
        }
      }, 8_000);

      activeSocket.emit('chat_edit', { messageId, text }, (result: ChatSendResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(result?.ok ? { ok: true } : { ok: false, error: result?.error || 'تعذر تعديل الرسالة' });
      });
    });
  }, []);

  const deleteChatMessage = useCallback(async (messageId: string): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected) return { ok: false, error: 'الاتصال بالغرفة غير جاهز' };
    if (!messageId) return { ok: false, error: 'تعذر حذف الرسالة' };

    return new Promise((resolve) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ ok: false, error: 'انتهت مهلة حذف الرسالة' });
        }
      }, 8_000);

      activeSocket.emit('chat_delete', { messageId }, (result: ChatSendResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (result?.ok) {
          const deletedAt = result.deletedAt || new Date().toISOString();
          const deletedMessageId = result.messageId || messageId;
          deletedMessageTombstonesRef.current.set(deletedMessageId, deletedAt);
          setMessages((current) => tombstoneMessage(current, deletedMessageId, deletedAt));
          resolve({ ok: true });
          return;
        }
        resolve({ ok: false, error: result?.error || 'تعذر حذف الرسالة' });
      });
    });
  }, []);

  const changeVideo = useCallback(async (
    newVideoId: string,
    kind = '',
    season = '',
    episode = '',
  ): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || (!isHost && !userPermissions.canChangeMedia)) {
      return { ok: false, error: 'غير مصرح بتغيير المحتوى' };
    }
    return emitWithAcknowledgement(activeSocket, 'change_video', { videoId: newVideoId, kind, season, episode });
  }, [isHost, userPermissions.canChangeMedia]);

  const changeEpisode = useCallback(async (episodeId: string, season = '', episode = ''): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || (!isHost && !userPermissions.canChangeMedia)) {
      return { ok: false, error: 'غير مصرح بتغيير الحلقة' };
    }
    return emitWithAcknowledgement(activeSocket, 'change_episode', { episodeId, season, episode });
  }, [isHost, userPermissions.canChangeMedia]);

  const setModeratorPermissions = useCallback(async (
    targetSocketId: string,
    permissions: MemberPermissions,
  ): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || !isHost) return { ok: false, error: 'غير مصرح' };
    return emitWithAcknowledgement(activeSocket, 'set_moderator_permissions', { targetSocketId, permissions });
  }, [isHost]);

  const removeModerator = useCallback(async (targetSocketId: string): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || !isHost) return { ok: false, error: 'غير مصرح' };
    return emitWithAcknowledgement(activeSocket, 'remove_moderator', { targetSocketId });
  }, [isHost]);

  const kickUser = useCallback(async (targetSocketId: string): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || (!isHost && !userPermissions.canKick)) {
      return { ok: false, error: 'غير مصرح بالطرد' };
    }
    return emitWithAcknowledgement(activeSocket, 'kick_user', { targetSocketId });
  }, [isHost, userPermissions.canKick]);

  const banUser = useCallback(async (targetSocketId: string): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || (!isHost && !userPermissions.canBan)) {
      return { ok: false, error: 'غير مصرح بالحظر' };
    }
    return emitWithAcknowledgement(activeSocket, 'ban_user', { targetSocketId });
  }, [isHost, userPermissions.canBan]);

  const closeRoom = useCallback(async () => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || !isHost) return;

    await new Promise<void>((resolve) => {
      let completed = false;
      const timeout = window.setTimeout(() => {
        if (!completed) {
          completed = true;
          resolve();
        }
      }, 1_500);
      activeSocket.emit('delete_room', () => {
        if (completed) return;
        completed = true;
        window.clearTimeout(timeout);
        resolve();
      });
    });
  }, [isHost]);

  return {
    connectionState,
    isHost,
    userRole,
    userPermissions,
    roomState,
    members,
    messages,
    isChatHistoryLoaded,
    sendSyncUpdate,
    changeVideo,
    changeEpisode,
    setModeratorPermissions,
    removeModerator,
    kickUser,
    banUser,
    closeRoom,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
    remoteVideoId,
    remoteEpisodeId,
    isKicked,
    isBanned,
    banReason,
    isRoomClosed,
    connectionError,
  };
}
