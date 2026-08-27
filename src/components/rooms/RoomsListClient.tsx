'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageHelper';
import CreateRoomButton from '@/components/CreateRoomButton';
import UserAvatar from '@/components/UserAvatar';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';

interface ActiveRoom {
  id: string;
  title: string;
  movieTitle: string | null;
  moviePoster: string | null;
  hostId?: string;
  host: {
    name: string | null;
    imageUrl: string | null;
  } | null;
}

interface RoomsListClientProps {
  initialRooms: ActiveRoom[];
  loadError: string | null;
}

type TabType = 'active' | 'my_rooms';

export default function RoomsListClient({ initialRooms, loadError }: RoomsListClientProps) {
  const router = useRouter();
  const { user, isSignedIn } = useUnifiedAuth();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>(initialRooms);
  const [userRooms, setUserRooms] = useState<ActiveRoom[]>([]);
  const [loadingUserRooms, setLoadingUserRooms] = useState(false);

  // Batch Selection State for "My Rooms"
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchActiveRooms = async () => {
    try {
      const res = await fetch('/api/rooms?type=active', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.rooms) setActiveRooms(data.rooms);
      }
    } catch (err) {
      console.error('Error fetching active rooms:', err);
    }
  };

  const fetchUserRooms = async () => {
    if (!isSignedIn && !user) return;
    try {
      setLoadingUserRooms(true);
      const res = await fetch('/api/rooms?type=user', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUserRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Error fetching user rooms:', err);
    } finally {
      setLoadingUserRooms(false);
    }
  };

  useEffect(() => {
    if (isSignedIn || user) {
      fetchUserRooms();
    }
  }, [isSignedIn, user]);

  // Real-time synchronization listener
  useEffect(() => {
    const handleRoomsUpdate = () => {
      fetchActiveRooms();
      if (isSignedIn || user) {
        fetchUserRooms();
      }
    };
    window.addEventListener('rooms-updated', handleRoomsUpdate);
    return () => window.removeEventListener('rooms-updated', handleRoomsUpdate);
  }, [isSignedIn, user]);

  const allUserRoomIds = userRooms.map((r) => r.id);
  const isAllSelected = userRooms.length > 0 && selectedRoomIds.length === userRooms.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(allUserRoomIds);
    }
  };

  const toggleSelectRoom = (id: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedRoomIds.length === 0 || isDeleting) return;
    setIsDeleting(true);

    const deletedIds = [...selectedRoomIds];
    // Immediate optimistic update for real-time UI response
    setUserRooms((prev) => prev.filter((r) => !deletedIds.includes(r.id)));
    setActiveRooms((prev) => prev.filter((r) => !deletedIds.includes(r.id)));

    try {
      const response = await fetch('/api/rooms/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomIds: deletedIds }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message || `تم حذف ${deletedIds.length} غرفة بنجاح`);
        setSelectedRoomIds([]);
        setIsSelectionMode(false);
        setShowConfirmModal(false);
        window.dispatchEvent(new CustomEvent('rooms-updated'));
        fetchActiveRooms();
        fetchUserRooms();
        router.refresh();
      } else {
        toast.error(result.error || 'تعذر حذف الغرف المحددة');
        fetchActiveRooms();
        fetchUserRooms();
      }
    } catch {
      toast.error('حدث خطأ في الاتصال أثناء حذف الغرف');
      fetchActiveRooms();
      fetchUserRooms();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingleRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Immediate optimistic update for real-time UI response
    setUserRooms((prev) => prev.filter((r) => r.id !== roomId));
    setActiveRooms((prev) => prev.filter((r) => r.id !== roomId));

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف الغرفة بنجاح');
        window.dispatchEvent(new CustomEvent('rooms-updated'));
        fetchActiveRooms();
        fetchUserRooms();
        router.refresh();
      } else {
        toast.error(data.error || 'تعذر حذف الغرفة');
        fetchActiveRooms();
        fetchUserRooms();
      }
    } catch {
      toast.error('حدث خطأ أثناء حذف الغرفة');
      fetchActiveRooms();
      fetchUserRooms();
    }
  };

  const handleCopyLink = (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ رابط الغرفة بنجاح');
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 xl:px-8 xl:pt-28" dir="rtl">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-3 text-2xl font-black text-white drop-shadow-md sm:text-3xl">
              <i className="fa-solid fa-fire text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.7)]" aria-hidden="true" />
              غرف المشاهدة الجماعية
            </h1>
          </div>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm font-medium leading-6 text-slate-400">
            انضم إلى مشاهدة مباشرة مع الأصدقاء، وشارك اللحظة والدردشة في الوقت نفسه.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CreateRoomButton />
        </div>
      </div>

      {/* Segmented Capsule Control Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0c1220] p-1.5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 flex-1">
          {/* Tab 1: Active Rooms */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('active');
              setIsSelectionMode(false);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-red-600 to-[#E50914] text-white shadow-[0_2px_12px_rgba(229,9,20,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-fire text-amber-400 text-xs"></i>
            <span>الرومات النشطة</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'active' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
            }`}>
              {activeRooms.length}
            </span>
          </button>

          {/* Tab 2: My Rooms */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('my_rooms');
              if (userRooms.length === 0) fetchUserRooms();
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none ${
              activeTab === 'my_rooms'
                ? 'bg-gradient-to-r from-red-600 to-[#E50914] text-white shadow-[0_2px_12px_rgba(229,9,20,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-user text-sky-400 text-xs"></i>
            <span>روماتي</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'my_rooms' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
            }`}>
              {userRooms.length}
            </span>
          </button>
        </div>

        {/* Selection Mode Toggle Button (Visible only on My Rooms tab) */}
        {activeTab === 'my_rooms' && userRooms.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setIsSelectionMode((prev) => !prev);
              if (isSelectionMode) setSelectedRoomIds([]);
            }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
              isSelectionMode
                ? 'border-red-500/60 bg-red-500/20 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <i className={`fa-solid ${isSelectionMode ? 'fa-xmark' : 'fa-list-check'} text-xs`}></i>
            <span>{isSelectionMode ? 'إلغاء التحديد' : 'تحديد الغرف'}</span>
          </button>
        )}
      </div>

      {/* Batch Control Action Bar */}
      {activeTab === 'my_rooms' && isSelectionMode && userRooms.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-red-500/30 bg-[#121827]/95 p-4 shadow-2xl backdrop-blur-md animate-fade-in-up">
          <div
            onClick={toggleSelectAll}
            className="flex items-center gap-3 cursor-pointer text-sm font-bold text-white select-none group"
          >
            {/* Custom Telegram-Style Checkbox */}
            <div
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                isAllSelected
                  ? 'bg-red-600 border-red-500 text-white shadow-[0_0_12px_rgba(229,9,20,0.5)] scale-105'
                  : 'border-white/30 bg-black/40 text-transparent group-hover:border-white/50'
              }`}
            >
              <i className="fa-solid fa-check text-xs font-black"></i>
            </div>
            <span>تحديد الكل ({userRooms.length})</span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300">
              تم تحديد <strong className="text-white font-mono text-sm">{selectedRoomIds.length}</strong> غرفة
            </span>
            <button
              type="button"
              disabled={selectedRoomIds.length === 0}
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-98"
            >
              <i className="fa-solid fa-trash-can" aria-hidden="true" />
              <span>حذف الغرف المحددة</span>
            </button>
          </div>
        </div>
      )}

      {/* Load Error State */}
      {loadError && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm font-bold text-amber-200">
          <i className="fa-solid fa-triangle-exclamation ml-2" />
          {loadError}
        </div>
      )}

      {/* TAB 1: ACTIVE PUBLIC ROOMS */}
      {activeTab === 'active' && (
        <>
          {activeRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#0d121d]/60 p-12 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-slate-400">
                <i className="fa-solid fa-door-closed" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">لا توجد غرف عامة نشطة حالياً</h2>
              <p className="mb-6 max-w-sm text-sm text-slate-400">
                كن أول من يبدأ جلسة مشاهدة جماعية وادعُ أصدقاءك للمشاركة الآن!
              </p>
              <CreateRoomButton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeRooms.map((room) => (
                <div
                  key={room.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a] transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:shadow-[0_12px_35px_rgba(229,9,20,0.25)]"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#080d1a]">
                    {room.moviePoster ? (
                      <Image
                        src={getImageUrl(room.moviePoster, 'backdrop') || getImageUrl(room.moviePoster, 'poster') || '/icon.svg'}
                        alt={room.movieTitle || room.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-3xl text-slate-600">
                        <i className="fa-solid fa-film" aria-hidden="true" />
                      </div>
                    )}
                    {/* Seamless Gradient Overlay covering subpixel joint */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/60 to-transparent pointer-events-none z-10" />

                    {/* Live Badge */}
                    <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-black/60 px-2.5 py-1 text-[11px] font-black text-emerald-400 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <span className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-ping" />
                        <span className="w-0.5 h-3.5 bg-emerald-400 rounded-full animate-bounce" />
                      </span>
                      <span>مباشر</span>
                    </div>
                  </div>

                  {/* Room Details - overlapping to eliminate subpixel gap */}
                  <div className="flex flex-1 flex-col p-4 -mt-2 pt-4 relative z-10 bg-[#080d1a]">
                    <h3 className="mb-1 text-base font-black text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                      {room.title}
                    </h3>
                    <p className="mb-3 text-xs font-medium text-slate-400 line-clamp-1">
                      {room.movieTitle || 'فيلم / مسلسل مباشر'}
                    </p>

                    {/* Host Details */}
                    <div className="mb-4 flex items-center gap-2 border-t border-white/5 pt-2.5">
                      <UserAvatar
                        name={room.host?.name || 'مضيف الغرفة'}
                        imageUrl={room.host?.imageUrl}
                        className="size-6 rounded-full border border-white/20"
                      />
                      <span className="text-xs font-bold text-slate-300 truncate">
                        {room.host?.name || 'مجهول'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(room.id, e)}
                        title="مشاركة الرابط"
                        className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/30 cursor-pointer active:scale-95"
                      >
                        <i className="fa-solid fa-share-nodes text-xs" />
                      </button>
                      <Link
                        href={`/room/${room.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-[#E50914] px-4 py-2 text-xs font-black text-white transition hover:from-red-500 hover:to-red-600 shadow-[0_2px_10px_rgba(229,9,20,0.35)] active:scale-95"
                      >
                        <span>دخول</span>
                        <i className="fa-solid fa-arrow-left text-[9px]" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: MY CREATED ROOMS */}
      {activeTab === 'my_rooms' && (
        <>
          {loadingUserRooms && (
            <div className="flex justify-center py-16">
              <div className="size-10 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
            </div>
          )}

          {!loadingUserRooms && userRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#0d121d]/60 p-12 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-slate-400">
                <i className="fa-solid fa-folder-open" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">لم تقم بإنشاء أي غرف مشاهدة بعد</h2>
              <p className="mb-6 max-w-sm text-sm text-slate-400">
                أنشئ غرفتك الخاصة الآن واستمتع بالمشاهدة مع من تحب!
              </p>
              <CreateRoomButton />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {userRooms.map((room) => {
              const isSelected = selectedRoomIds.includes(room.id);
              return (
                <div
                  key={room.id}
                  onClick={() => isSelectionMode && toggleSelectRoom(room.id)}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isSelected
                      ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                      : 'border-white/10 bg-[#080d1a] hover:border-red-500/40 hover:shadow-[0_10px_30px_rgba(229,9,20,0.2)] hover:-translate-y-1'
                  } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                >
                  {/* Custom Checkbox */}
                  {isSelectionMode && (
                    <div className="absolute right-3 top-3 z-20">
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-md ${
                          isSelected
                            ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(229,9,20,0.5)] scale-105'
                            : 'border-white/40 bg-black/60 text-transparent'
                        }`}
                      >
                        <i className="fa-solid fa-check text-xs font-black"></i>
                      </div>
                    </div>
                  )}

                  {/* Poster Image */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#080d1a]">
                    {room.moviePoster ? (
                      <Image
                        src={getImageUrl(room.moviePoster, 'backdrop') || getImageUrl(room.moviePoster, 'poster') || '/icon.svg'}
                        alt={room.movieTitle || room.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-3xl text-slate-600">
                        <i className="fa-solid fa-film" aria-hidden="true" />
                      </div>
                    )}
                    {/* Seamless Gradient Overlay covering subpixel joint */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/60 to-transparent pointer-events-none z-10" />

                    {/* Owner Badge */}
                    <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-black/60 px-2.5 py-1 text-[11px] font-black text-sky-400 backdrop-blur-md">
                      <i className="fa-solid fa-crown text-amber-400 text-xs" />
                      <span>غرفتك</span>
                    </div>
                  </div>

                  {/* Room Details - overlapping to eliminate subpixel gap */}
                  <div className="flex flex-1 flex-col p-4 -mt-2 pt-4 relative z-10 bg-[#080d1a]">
                    <h3 className="mb-1 text-base font-black text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                      {room.title}
                    </h3>
                    <p className="mb-4 text-xs font-medium text-slate-400 line-clamp-1">
                      {room.movieTitle || 'فيلم / مسلسل مباشر'}
                    </p>

                    {/* Actions */}
                    {!isSelectionMode && (
                      <div className="mt-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(room.id, e)}
                          title="نسخ الرابط"
                          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/30 cursor-pointer"
                        >
                          <i className="fa-solid fa-share-nodes text-xs" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingleRoom(room.id, e)}
                          title="حذف الغرفة"
                          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 cursor-pointer"
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
                        </button>
                        <Link
                          href={`/room/${room.id}`}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-[#E50914] px-4 py-2 text-xs font-black text-white transition hover:from-red-500 hover:to-red-600 shadow-[0_2px_10px_rgba(229,9,20,0.35)] active:scale-98"
                        >
                          <span>دخول</span>
                          <i className="fa-solid fa-arrow-left text-[9px]" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmation Modal for Batch Deletion */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0e1424] p-6 text-center shadow-2xl animate-scale-up">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/20 text-2xl text-red-500 shadow-lg">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-lg font-black text-white">تأكيد حذف الغرف</h3>
            <p className="mb-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف <strong className="text-white font-black">{selectedRoomIds.length}</strong> غرفة محددة؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleBatchDelete}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs sm:text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، احذف الغرف'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs sm:text-sm font-bold text-slate-300 transition hover:bg-white/10 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
