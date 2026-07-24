"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/utils/imageHelper";
import { getUserRooms, deleteRoom } from "@/app/actions/room.actions";
import { useClerk } from "@clerk/nextjs";
import toast from 'react-hot-toast';

export default function MyRoomsList() {
  let closeUserProfile: (() => void) | undefined;
  try {
    const clerk = useClerk();
    closeUserProfile = clerk?.closeUserProfile;
  } catch (e) {
    // Pure Telegram Session
  }
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleBrowse = (e: React.MouseEvent) => {
    e.preventDefault();
    if (closeUserProfile) {
      closeUserProfile();
    }
    window.location.href = '/movies';
  };

  useEffect(() => {
    async function fetchRooms() {
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
    }
    fetchRooms();
  }, []);

  const handleCopyLink = (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ رابط الغرفة بنجاح! 📋');
  };

  const handleDelete = async (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('هل أنت متاكد من إغلاق وحذف هذه الغرفة نهائياً؟')) {
      return;
    }

    setDeletingId(roomId);
    try {
      const res = await deleteRoom(roomId);
      if (res.success) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
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
        <div key={room.id} className="relative group rounded-xl overflow-hidden shadow-lg bg-[#111] border border-white/10 flex flex-col">
          <Link href={`/room/${room.id}`} className="block relative aspect-[16/9] w-full">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="absolute top-2 right-2 flex gap-2">
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${room.isPrivate ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white'}`}>
                {room.isPrivate ? 'خاصة' : 'عامة'}
              </span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${room.isActive ? 'bg-red-600/80 text-white' : 'bg-gray-500/80 text-white'}`}>
                {room.isActive ? 'نشطة' : 'مغلقة'}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-3">
              <h4 className="text-white font-bold text-sm line-clamp-1 drop-shadow-md">
                {room.title}
              </h4>
              <p className="text-gray-300 text-[10px] mt-1 line-clamp-1">
                {room.movieTitle || 'فيلم / مسلسل'}
              </p>
            </div>
          </Link>

          {/* Action Toolbar */}
          <div className="bg-[#0a0a0f] p-3 flex justify-between items-center border-t border-white/5">
             <button 
                onClick={(e) => handleCopyLink(room.id, e)}
                className="text-xs text-gray-300 hover:text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
             >
                <i className="fa-solid fa-link text-red-500"></i> نسخ الرابط
             </button>
             
             <button
                onClick={(e) => handleDelete(room.id, e)}
                disabled={deletingId === room.id}
                className="text-xs text-red-500 hover:text-red-400 font-extrabold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
             >
                {deletingId === room.id ? (
                  <span className="animate-pulse">جاري الحذف...</span>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can"></i> حذف الغرفة
                  </>
                )}
             </button>
          </div>
        </div>
      ))}
    </div>
  );
}
