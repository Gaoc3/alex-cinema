"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/utils/imageHelper";
import { getUserRooms, deleteRoom } from "@/app/actions/room.actions";
import { useClerk } from "@clerk/nextjs";
import toast from 'react-hot-toast';

import ConfirmModal from "@/components/ConfirmModal";

interface RoomSummary {
  id: string;
  title: string;
  movieTitle: string | null;
  moviePoster: string | null;
  isPrivate: boolean;
  isActive: boolean;
}

export default function MyRoomsList() {
  let closeUserProfile: (() => void) | undefined;
  try {
    const clerk = useClerk();
    closeUserProfile = clerk?.closeUserProfile;
  } catch {
    // Pure Telegram Session
  }
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleBrowse = (e: React.MouseEvent) => {
    e.preventDefault();
    if (closeUserProfile) {
      closeUserProfile();
    }
    window.location.href = '/movies';
  };

  const fetchRooms = async () => {
    try {
      const res = await getUserRooms();
      if (res.success && res.rooms) {
        setRooms(res.rooms);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    const handleRoomsUpdate = () => {
      fetchRooms();
    };
    window.addEventListener('rooms-updated', handleRoomsUpdate);
    return () => window.removeEventListener('rooms-updated', handleRoomsUpdate);
  }, []);

  const handleCopyLink = (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ رابط الغرفة بنجاح! 📋');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const roomId = deleteTargetId;
    setDeleteTargetId(null);

    setDeletingId(roomId);
    try {
      const res = await deleteRoom(roomId);
      if (res.success) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        window.dispatchEvent(new CustomEvent('rooms-updated'));
        toast.success('تم حذف الغرفة نهائياً 🗑️');
      } else {
        toast.error(res.error || 'حدث خطأ أثناء حذف الغرفة');
      }
    } catch (err) {
      console.error("Delete room error:", err);
      toast.error('حدث خطأ أثناء حذف الغرفة');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center p-12 text-red-400 font-bold">
        <p>حدث خطأ أثناء تحميل غرف المشاهدة.</p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
          <i className="fa-solid fa-users text-3xl text-gray-400"></i>
        </div>
        <h3 className="text-xl font-black text-white mb-2">لا توجد غرف مشاهدة</h3>
        <p className="text-gray-400 text-sm max-w-[280px]">قم بإنشاء غرفة مشاهدة للأفلام والمسلسلات وتصفح المكتبة لدعوة أصدقائك.</p>
        <button 
          onClick={handleBrowse} 
          className="mt-6 px-6 py-2.5 bg-[#e50914] hover:bg-[#b91c1c] text-white font-extrabold rounded-xl transition-all shadow-[0_4px_18px_rgba(229,9,20,0.5)] active:scale-95 cursor-pointer"
        >
          تصفح مكتبة الأفلام
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 rtl" dir="rtl">
      {rooms.map((room) => (
        <div key={room.id} className="relative group rounded-2xl overflow-hidden shadow-xl bg-[#080d1a] border border-white/10 hover:border-red-500/50 transition-all duration-300 flex flex-col">
          <Link href={`/room/${room.id}`} className="block relative aspect-[16/9] w-full overflow-hidden bg-[#080d1a]">
            {room.moviePoster ? (
              <Image
                src={getImageUrl(room.moviePoster, 'backdrop')}
                alt={room.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <i className="fa-solid fa-users text-2xl text-gray-600"></i>
              </div>
            )}
            {/* Seamless Gradient Overlay */}
            <div className="absolute -bottom-0.5 inset-x-0 h-3/4 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/60 to-transparent pointer-events-none z-10" />
            
            <div className="absolute top-2 right-2 flex gap-2 z-20">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black backdrop-blur-md ${room.isPrivate ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white'}`}>
                {room.isPrivate ? 'خاصة' : 'عامة'}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black backdrop-blur-md ${room.isActive ? 'bg-red-600/80 text-white' : 'bg-gray-500/80 text-white'}`}>
                {room.isActive ? 'نشطة' : 'مغلقة'}
              </span>
            </div>

            <div className="absolute bottom-2 right-3 left-3 z-20">
              <h4 className="text-white font-black text-sm truncate drop-shadow-md">{room.title}</h4>
              <p className="text-gray-300 text-xs truncate mt-0.5">{room.movieTitle || 'لم يتم اختيار محتوى بعد'}</p>
            </div>
          </Link>

          <div className="p-3 bg-[#080d1a] flex items-center justify-between border-t border-white/5 relative z-10">
            <button
              onClick={(e) => handleCopyLink(room.id, e)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-link text-[10px]"></i>
              نسخ الرابط
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteTargetId(room.id);
              }}
              disabled={deletingId === room.id}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              <i className="fa-solid fa-trash text-[10px]"></i>
              {deletingId === room.id ? 'جاري الحذف...' : 'حذف'}
            </button>
          </div>
        </div>
      ))}

      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="حذف غرفة المشاهدة"
        description="هل أنت متأكد من رغبتك في حذف هذه الغرفة نهائياً؟ سيتم إلغاء الرابط ولن تتمكن من استعادتها."
        confirmText="حذف الغرفة"
        cancelText="إلغاء"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
