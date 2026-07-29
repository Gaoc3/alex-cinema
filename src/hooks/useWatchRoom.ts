import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RoomState {
  time: number;
  playing: boolean;
  lastUpdated: number;
  receivedAt?: number;
}

export interface RoomMember {
  id: string;
  name: string;
  isHost: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
  isHost?: boolean;
}

interface ChatSendResult {
  ok: boolean;
  error?: string;
}

export interface WatchRoomHook {
  isHost: boolean;
  roomState: RoomState | null;
  members: RoomMember[];
  messages: ChatMessage[];
  sendSyncUpdate: (time: number, playing: boolean) => void;
  changeVideo: (newVideoId: string, kind?: string, season?: string, episode?: string) => Promise<ChatSendResult>;
  changeEpisode: (episodeId: string, season?: string, episode?: string) => Promise<ChatSendResult>;
  kickUser: (targetSocketId: string) => void;
  closeRoom: () => Promise<void>;
  sendChatMessage: (text: string) => Promise<ChatSendResult>;
  remoteVideoId: string | null;
  remoteEpisodeId: string | null;
  isKicked: boolean;
  isRoomClosed: boolean;
  connectionError: string | null;
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...current, ...incoming]) {
    if (message?.id) byId.set(message.id, message);
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

export function useWatchRoom(
  roomId: string,
  initIsHost: boolean,
  username: string,
): WatchRoomHook {
  const [isHost, setIsHost] = useState(initIsHost);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<RoomMember[]>(() => (
    username ? [{ id: 'self', name: username, isHost: initIsHost }] : []
  ));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteVideoId, setRemoteVideoId] = useState<string | null>(null);
  const [remoteEpisodeId, setRemoteEpisodeId] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState(false);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const identityRef = useRef({ username, initIsHost });

  useEffect(() => {
    identityRef.current = { username, initIsHost };
  }, [username, initIsHost]);

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
    queueMicrotask(() => {
      if (!cancelled) {
        setMessages([]);
        setConnectionError(null);
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
      try {
        const token = await fetchToken();
        if (cancelled) return;
        newSocket.auth = { token };
        newSocket.connect();
      } catch (error) {
        if (!cancelled) {
          setConnectionError(error instanceof Error ? error.message : 'تعذر الاتصال بالغرفة');
        }
      } finally {
        refreshingToken = false;
      }
    };

    newSocket.on('connect', () => {
      authRefreshAttempts = 0;
      if (authRetryTimer !== null) {
        window.clearTimeout(authRetryTimer);
        authRetryTimer = null;
      }
      setConnectionError(null);
      setMembers([{
        id: newSocket.id || 'self',
        name: identityRef.current.username || 'مشاهد',
        isHost: identityRef.current.initIsHost,
      }]);
      newSocket.emit('join_room', { roomId }, (result: ChatSendResult) => {
        if (result?.ok) return;
        setConnectionError(result?.error || 'تعذر دخول الغرفة');
        newSocket.disconnect();
      });
    });

    newSocket.on('connect_error', (error) => {
      const message = error?.message || 'تعذر الاتصال بالغرفة';
      if (message === 'AUTH_EXPIRED') {
        newSocket.disconnect();
        if (authRefreshAttempts >= 3) {
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
        setConnectionError('تعذر التحقق من جلسة الغرفة، أعد تحميل الصفحة');
        return;
      }
      setConnectionError(message);
    });

    newSocket.on('room_state', (data) => {
      setIsHost(Boolean(data?.isHost));
      setRemoteVideoId(typeof data?.videoId === 'string' ? data.videoId : null);
      setRemoteEpisodeId(typeof data?.episodeId === 'string' ? data.episodeId : null);
      if (data?.state) setRoomState({ ...data.state, receivedAt: Date.now() });
      if (Array.isArray(data?.members)) setMembers(data.members);
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
      if (Array.isArray(history)) setMessages((current) => mergeMessages(current, history));
    });

    newSocket.on('chat_message', (message: ChatMessage) => {
      if (message?.id) setMessages((current) => mergeMessages(current, [message]));
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
      setIsKicked(true);
      newSocket.disconnect();
    });

    newSocket.on('room_deleted', () => {
      terminalDisconnect = true;
      setIsRoomClosed(true);
      setConnectionError('تم إغلاق هذه الغرفة');
      newSocket.disconnect();
    });

    newSocket.on('disconnect', (reason) => {
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
    if (socketRef.current?.connected && isHost) {
      socketRef.current.emit('sync_update', { time, playing });
    }
  }, [isHost]);

  const sendChatMessage = useCallback(async (rawText: string): Promise<ChatSendResult> => {
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
        clientNonce: crypto.randomUUID(),
      }, (result: ChatSendResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(result?.ok ? { ok: true } : { ok: false, error: result?.error || 'تعذر إرسال الرسالة' });
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
    if (!activeSocket?.connected || !isHost) return { ok: false, error: 'الاتصال بالغرفة غير جاهز' };
    return emitWithAcknowledgement(activeSocket, 'change_video', { videoId: newVideoId, kind, season, episode });
  }, [isHost]);

  const kickUser = useCallback((targetSocketId: string) => {
    if (socketRef.current?.connected && isHost) {
      socketRef.current.emit('kick_user', { targetSocketId });
    }
  }, [isHost]);

  const changeEpisode = useCallback(async (episodeId: string, season = '', episode = ''): Promise<ChatSendResult> => {
    const activeSocket = socketRef.current;
    if (!activeSocket?.connected || !isHost) return { ok: false, error: 'الاتصال بالغرفة غير جاهز' };
    return emitWithAcknowledgement(activeSocket, 'change_episode', { episodeId, season, episode });
  }, [isHost]);

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
    isHost,
    roomState,
    members,
    messages,
    sendSyncUpdate,
    changeVideo,
    changeEpisode,
    kickUser,
    closeRoom,
    sendChatMessage,
    remoteVideoId,
    remoteEpisodeId,
    isKicked,
    isRoomClosed,
    connectionError,
  };
}
