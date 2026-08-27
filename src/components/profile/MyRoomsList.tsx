"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/utils/imageHelper";
import { getUserRooms, deleteRoom, toggleRoomActive, toggleRoomPrivacy } from "@/app/actions/room.actions";
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  const counts = useMemo(() => {
    return {
      all: rooms.length,
      active: rooms.filter((r) => r.isActive).length,
      closed: rooms.filter((r) => !r.isActive).length,
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (activeFilter === 'active') return rooms.filter((r) => r.isActive);
    if (activeFilter === 'closed') return rooms.filter((r) => !r.isActive);
    return rooms;
  }, [rooms, activeFilter]);

  const handleToggleActive = async (roomId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = !currentStatus;
    // Optimistic UI update
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, isActive: newStatus } : r));
    try {
      const res = await toggleRoomActive(roomId, newStatus);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('rooms-updated'));
        toast.success(newStatus ? 'تم فتح الغرفة وبدء البث المباشر' : 'تم إغلاق الغرفة بنجاح');
      } else {
        setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, isActive: currentStatus } : r));
        toast.error(res.error || 'تعذر تغيير حالة الغرفة');
      }
    } catch {
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, isActive: currentStatus } : r));
      toast.error('حدث خطأ أثناء تغيير حالة الغرفة');
    }
  };

  const handleTogglePrivacy = async (roomId: string, currentPrivate: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newPrivate = !currentPrivate;
    // Optimistic UI update
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, isPrivate: newPrivate } : r));
    try {
      const res = await toggleRoomPrivacy(roomId, newPrivate);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('rooms-updated'));
        toast.success(newPrivate ? 'تم تعيين الغرفة كغرفة خاصة' : 'تم تعيين الغرفة كغرفة عامة');
      } else {
        setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, isPrivate: currentPrivate } : r));
        toast.error(res.error || 'تعذر تعديل الخصوصية');
      }
    } catch {
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, isPrivate: currentPrivate } : r));
      toast.error('حدث خطأ أثناء تعديل الخصوصية');
    }
  };

  const handleCopyLink = (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ رابط الغرفة بنجاح');
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
        toast.success('تم حذف الغرفة نهائياً');
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
      <div className="w-full flex flex-col items-center justify-center py-16 gap-3">
        <div className="size-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(56,189,248,0.4)]" />
        <span className="text-xs text-slate-400 font-bold animate-pulse">جاري تحميل غرف المشاهدة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 px-4 text-center gap-3 bg-red-950/20 border border-red-500/20 rounded-3xl" dir="rtl">
        <div className="size-12 rounded-2xl bg-red-600/20 flex items-center justify-center text-red-400 text-xl">
          <i className="fa-solid fa-triangle-exclamation" />
        </div>
        <p className="text-sm text-red-300 font-bold">حدث خطأ أثناء تحميل غرف المشاهدة.</p>
        <button
          type="button"
          onClick={() => { setError(false); setLoading(true); fetchRooms(); }}
          className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <i className="fa-solid fa-rotate-right text-xs" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center" dir="rtl">
        <div className="size-20 mb-5 rounded-3xl bg-gradient-to-b from-sky-500/20 to-blue-950/30 flex items-center justify-center border border-sky-500/25 shadow-[0_0_35px_rgba(56,189,248,0.25)]">
          <i className="fa-solid fa-users text-3xl text-sky-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white mb-2">لم تنشئ أي غرف مشاهدة بعد</h3>
        <p className="text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed font-medium mb-6">
          أنشئ غرفتك الخاصة الآن واستمتع بمشاهدة الأفلام والمسلسلات في بث متزامن وفوري مع أصدقائك!
        </p>
        <Link
          href="/rooms?create=true"
          className="px-7 py-3 bg-gradient-to-r from-red-600 to-[#E50914] hover:from-red-500 hover:to-red-600 text-white font-black rounded-2xl transition-all shadow-[0_4px_25px_rgba(229,9,20,0.5)] hover:shadow-[0_0_30px_rgba(229,9,20,0.7)] active:scale-95 cursor-pointer text-xs sm:text-sm flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" />
          <span>إنشاء غرفة مشاهدة جديدة</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4" dir="rtl">
      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>الكل</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeFilter === 'all' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>نشطة</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeFilter === 'active' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('closed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'closed'
                ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>مغلقة</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeFilter === 'closed' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
              {counts.closed}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
          <i className="fa-solid fa-circle-info text-sky-400 text-xs" />
          <span>انقر على الشارات للتحكم الفوري بالبث والخصوصية</span>
        </span>
      </div>

      {/* Grid of Room Cards */}
      {filteredRooms.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs font-bold bg-white/[0.02] border border-white/[0.05] rounded-3xl">
          لا توجد غرف مطابقة لهذا التصنيف حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-0.5">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a] transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-[0_12px_35px_rgba(56,189,248,0.2)] shadow-[0_6px_20px_rgba(0,0,0,0.6)]"
            >
              {/* Poster & Backdrop Banner */}
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
                  <div className="size-full flex items-center justify-center bg-white/5 text-3xl text-slate-600">
                    <i className="fa-solid fa-film" />
                  </div>
                )}

                {/* Seamless Gradient Overlay covering entire frame bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/60 to-transparent pointer-events-none z-10" />

                {/* Hover Play Overlay Pill */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
                  <span className="px-4 py-2 rounded-xl bg-red-600/90 text-white font-black text-xs shadow-[0_0_20px_rgba(229,9,20,0.7)] flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <i className="fa-solid fa-play text-[10px]" />
                    <span>دخول الغرفة</span>
                  </span>
                </div>

                {/* Interactive Status Toggle Badge (Host Control) */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30">
                  {room.isActive ? (
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(room.id, true, e)}
                      title="الغرفة نشطة وبثها متاح - انقر للإغلاق"
                      className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>مباشر (اضغط للإغلاق)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(room.id, false, e)}
                      title="الغرفة مغلقة - انقر لبدء البث وفتح الغرفة للجميع"
                      className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/70 hover:bg-emerald-950/50 border border-white/20 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 backdrop-blur-md flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    >
                      <i className="fa-solid fa-power-off text-[9px] text-slate-400" />
                      <span>مغلقة (اضغط للفتح)</span>
                    </button>
                  )}
                </div>

                {/* Interactive Privacy Toggle Badge */}
                <div className="absolute top-3 left-3 z-30">
                  <button
                    type="button"
                    onClick={(e) => handleTogglePrivacy(room.id, room.isPrivate, e)}
                    title={room.isPrivate ? "غرفة خاصة - انقر لتحويلها إلى عامة" : "غرفة عامة تظهر للجميع - انقر لجعلها خاصة"}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md border cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 ${
                      room.isPrivate
                        ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-400'
                        : 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/40 text-sky-400'
                    }`}
                  >
                    <i className={room.isPrivate ? "fa-solid fa-lock text-[9px]" : "fa-solid fa-globe text-[9px]"} />
                    <span>{room.isPrivate ? 'خاصة' : 'عامة'}</span>
                  </button>
                </div>

                {/* Bottom Title on Image */}
                <div className="absolute bottom-2 right-3 left-3 z-20">
                  <h4 className="text-white font-black text-sm truncate group-hover:text-sky-400 transition-colors drop-shadow-md">
                    {room.title}
                  </h4>
                  <p className="text-slate-300 text-xs truncate mt-0.5 flex items-center gap-1 font-medium">
                    <i className="fa-solid fa-film text-[10px] text-red-500" />
                    <span>{room.movieTitle || 'لم يتم اختيار محتوى بعد'}</span>
                  </p>
                </div>
              </Link>

              {/* Action Bar */}
              <div className="p-3 bg-[#080d1a] flex items-center justify-between border-t border-white/5 relative z-10">
                <Link
                  href={`/room/${room.id}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-[#E50914] hover:from-red-500 hover:to-red-600 text-white font-black text-xs transition-all shadow-[0_2px_10px_rgba(229,9,20,0.35)] active:scale-95 cursor-pointer"
                >
                  <span>دخول</span>
                  <i className="fa-solid fa-arrow-left text-[9px]" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(room.id, e)}
                    title="نسخ رابط الغرفة"
                    className="size-8 rounded-xl bg-white/5 border border-white/10 hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/30 text-slate-300 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  >
                    <i className="fa-solid fa-link text-xs" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTargetId(room.id);
                    }}
                    disabled={deletingId === room.id}
                    title="حذف الغرفة"
                    className="size-8 rounded-xl bg-white/5 border border-white/10 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30 text-slate-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
