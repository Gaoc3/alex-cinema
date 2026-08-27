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
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1d] hover:border-red-500/50 hover:shadow-[0_12px_35px_rgba(229,9,20,0.25)] transition-all duration-300 hover:-translate-y-1 shadow-[0_6px_20px_rgba(0,0,0,0.6)]"
            >
              {/* Poster Area */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0a0f1d]">
                <Link href={`/room/${room.id}`} className="block size-full">
                  {room.moviePoster ? (
                    <Image
                      src={getImageUrl(room.moviePoster, 'backdrop') || getImageUrl(room.moviePoster, 'poster') || '/icon.svg'}
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

                  {/* Smooth organic cinema gradient fading directly into card background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/50 to-transparent pointer-events-none z-10" />
                </Link>

                {/* Top Badges (Interactive Status & Privacy) */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                  {room.isActive ? (
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(room.id, true, e)}
                      title="الغرفة نشطة وبثها متاح - انقر للإغلاق"
                      className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>مباشر</span>
                      <span className="text-[9px] opacity-75 font-normal">(اضغط للإغلاق)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(room.id, false, e)}
                      title="الغرفة مغلقة - انقر لبدء البث وفتح الغرفة للجميع"
                      className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/70 hover:bg-emerald-950/50 border border-white/20 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 backdrop-blur-md flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    >
                      <i className="fa-solid fa-power-off text-[9px] text-slate-400" />
                      <span>مغلقة</span>
                      <span className="text-[9px] opacity-60 font-normal">(اضغط للفتح)</span>
                    </button>
                  )}
                </div>

                <div className="absolute top-3 left-3 z-20">
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
              </div>

              {/* Card Details & Actions */}
              <div className="flex flex-1 flex-col p-4 pt-1">
                <Link href={`/room/${room.id}`} className="block mb-3 group/title">
                  <h3 className="text-white font-black text-sm truncate group-hover/title:text-red-400 transition-colors">
                    {room.title}
                  </h3>
                  <p className="text-slate-400 text-xs truncate mt-1 flex items-center gap-1.5 font-medium">
                    <i className="fa-solid fa-film text-[10px] text-red-500 shrink-0" />
                    <span className="truncate">{room.movieTitle || 'لم يتم اختيار محتوى بعد'}</span>
                  </p>
                </Link>

                {/* Action Bar */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                  <Link
                    href={`/room/${room.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-[#E50914] hover:from-red-500 hover:to-red-600 text-white font-black text-xs transition-all shadow-[0_2px_12px_rgba(229,9,20,0.35)] active:scale-98 cursor-pointer"
                  >
                    <span>دخول الغرفة</span>
                    <i className="fa-solid fa-arrow-left text-[9px]" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(room.id, e)}
                      title="نسخ رابط الغرفة"
                      aria-label="نسخ رابط الغرفة"
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
                      aria-label="حذف الغرفة"
                      className="size-8 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-600 hover:border-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.4)] group/del"
                    >
                      <svg className="size-3.5 group-hover/del:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
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
