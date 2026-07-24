import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface RoomState {
  time: number;
  playing: boolean;
  lastUpdated: number;
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
  time: string;
  isHost?: boolean;
}

interface WatchRoomHook {
  socket: Socket | null;
  isHost: boolean;
  roomState: RoomState | null;
  members: RoomMember[];
  messages: ChatMessage[];
  sendSyncUpdate: (time: number, playing: boolean) => void;
  changeVideo: (newVideoId: string, kind: string, season: string, episode: string) => void;
  kickUser: (targetSocketId: string) => void;
  sendChatMessage: (text: string) => void;
  remoteVideoId: string | null;
  isKicked: boolean;
}

export function useWatchRoom(roomId: string, initIsHost: boolean, username: string, videoId?: string): WatchRoomHook {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(initIsHost);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteVideoId, setRemoteVideoId] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');
    
    const newSocket = io(socketUrl);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to sync server');
      newSocket.emit('join_room', {
        roomId,
        isHost: initIsHost,
        videoId: videoId || null,
        kind: '1',
        season: '',
        episode: '',
        username
      });
    });

    newSocket.on('room_state', (data) => {
      setIsHost(data.isHost);
      if (data.videoId) {
        setRemoteVideoId(data.videoId);
      }
      if (data.state) {
        setRoomState(data.state);
      }
      if (data.members) {
        setMembers(data.members);
      }
    });

    newSocket.on('room_members', (updatedMembers: RoomMember[]) => {
      setMembers(updatedMembers);
    });

    newSocket.on('sync_update', (state: RoomState) => {
      setRoomState(state);
    });

    newSocket.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('host_left', () => {
      setRoomState(prev => prev ? { ...prev, playing: false } : null);
    });

    newSocket.on('change_video', (data) => {
      if (data.videoId) {
        setRemoteVideoId(data.videoId);
      }
    });

    newSocket.on('kicked', () => {
      setIsKicked(true);
      newSocket.disconnect();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, initIsHost, videoId, username]);

  const sendSyncUpdate = (time: number, playing: boolean) => {
    if (socketRef.current && isHost) {
      socketRef.current.emit('sync_update', {
        roomId,
        time,
        playing
      });
    }
  };

  const sendChatMessage = (text: string) => {
    if (socketRef.current && text.trim()) {
      const msg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        sender: username,
        text: text.trim(),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isHost
      };
      socketRef.current.emit('chat_message', { roomId, message: msg });
      setMessages((prev) => [...prev, msg]);
    }
  };

  const changeVideo = (newVideoId: string, kind: string, season: string, episode: string) => {
    if (socketRef.current && isHost) {
      socketRef.current.emit('change_video', {
        roomId,
        videoId: newVideoId,
        kind,
        season,
        episode
      });
    }
  };

  const kickUser = (targetSocketId: string) => {
    if (socketRef.current && isHost) {
      socketRef.current.emit('kick_user', {
        roomId,
        targetSocketId
      });
    }
  };

  return { 
    socket, 
    isHost, 
    roomState, 
    members, 
    messages,
    sendSyncUpdate, 
    changeVideo, 
    kickUser, 
    sendChatMessage,
    remoteVideoId, 
    isKicked 
  };
}
