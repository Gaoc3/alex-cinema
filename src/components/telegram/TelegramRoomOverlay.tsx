'use client';

import React, { useEffect, useState } from 'react';
import RoomClientWrapper from '@/app/room/[roomId]/RoomClientWrapper';
import type { RoomVideoData } from '@/components/watch/PlayerSection';
import type { SeriesEpisode, SeriesSeason } from '@/components/watch/SeriesNavigator';
import { useTelegramSafeArea } from '@/lib/telegramWebAppClient';

interface TelegramRoomOverlayProps {
  roomId: string;
  onClose: () => void;
}

interface RoomPayload {
  room: {
    id: string;
    hostId: string;
    title?: string | null;
    movieTitle?: string | null;
    moviePoster?: string | null;
    isPrivate?: boolean;
    host?: { name?: string | null; imageUrl?: string | null } | null;
  };
  currentUserId: string | null;
  isHostUser: boolean;
  video: RoomVideoData | null;
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
}

export default function TelegramRoomOverlay({ roomId, onClose }: TelegramRoomOverlayProps) {
  const [data, setData] = useState<RoomPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { contentSafeArea, safeArea } = useTelegramSafeArea();
  const paddingTop = Math.max(contentSafeArea.top, safeArea.top, 4);

  useEffect(() => {
    let isMounted = true;
    async function fetchRoom() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!isMounted) return;

        if (json.success && json.room) {
          setData(json);
        } else {
          setError(json.error || 'تعذر تحميل بيانات الغرفة');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching room overlay:', err);
        setError('حدث خطأ في الاتصال أثناء جلب الغرفة');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRoom();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#070a11] text-white flex flex-col overflow-y-auto animate-fade-in"
      style={{ paddingTop: `${paddingTop}px` }}
      dir="rtl"
    >
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
          <div className="w-12 h-12 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-300">جاري الدخول إلى غرفة المشاهدة...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl text-red-500 mb-4 shadow-xl">
            <i className="fa-solid fa-door-closed"></i>
          </div>
          <h2 className="text-xl font-black text-white mb-2">تعذر فتح الغرفة</h2>
          <p className="text-sm text-gray-400 max-w-sm mb-6">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-alex-primary hover:bg-red-700 active:scale-95 text-white text-sm font-black transition-all shadow-lg cursor-pointer"
          >
            الرجوع إلى قائمة الرومات
          </button>
        </div>
      )}

      {!loading && data && (
        <div className="flex-1 flex flex-col">
          <RoomClientWrapper
            roomId={data.room.id}
            roomData={{
              hostId: data.room.hostId,
              title: data.room.title,
              isPrivate: data.room.isPrivate,
              host: data.room.host,
            }}
            currentUserId={data.currentUserId}
            isHostUser={data.isHostUser}
            video={data.video}
            seasons={data.seasons || []}
            episodes={data.episodes || []}
            onExit={onClose}
          />
        </div>
      )}
    </div>
  );
}
