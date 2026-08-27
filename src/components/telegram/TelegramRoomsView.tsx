'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/utils/imageHelper';
import CreateRoomButton from '@/components/CreateRoomButton';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { toast } from 'react-hot-toast';

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

interface TelegramRoomsViewProps {
  onJoinRoom?: (roomId: string) => void;
}

type RoomsTab = 'active' | 'my_rooms';

export default function TelegramRoomsView({ onJoinRoom }: TelegramRoomsViewProps) {
  const { user, isSignedIn } = useUnifiedAuth();
  const [activeTab, setActiveTab] = useState<RoomsTab>('active');

  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [userRooms, setUserRooms] = useState<ActiveRoom[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingUser, setLoadingUser] = useState(false);

  // Selection & Batch Delete State for "My Rooms"
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchActiveRooms = async () => {
    try {
      setLoadingActive(true);
      const res = await fetch('/api/rooms?type=active', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Error loading active rooms:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchUserRooms = async () => {
    if (!isSignedIn && !user) {
      setUserRooms([]);
      return;
    }
    try {
      setLoadingUser(true);
      const res = await fetch('/api/rooms?type=user', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUserRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Error loading user rooms:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchActiveRooms();
    if (isSignedIn || user) {
      fetchUserRooms();
    }
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

    try {
      const response = await fetch('/api/rooms/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomIds: selectedRoomIds }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message || `تم حذف ${selectedRoomIds.length} غرفة بنجاح`);
        setUserRooms((prev) => prev.filter((r) => !selectedRoomIds.includes(r.id)));
        setSelectedRoomIds([]);
        setIsSelectionMode(false);
        setShowConfirmModal(false);
        fetchActiveRooms();
      } else {
        toast.error(result.error || 'تعذر حذف الغرف المحددة');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال أثناء حذف الغرف');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingleRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف الغرفة بنجاح');
        setUserRooms((prev) => prev.filter((r) => r.id !== roomId));
        fetchActiveRooms();
      } else {
        toast.error(data.error || 'تعذر حذف الغرفة');
      }
    } catch {
      toast.error('حدث خطأ أثناء حذف الغرفة');
    }
  };

  const handleCopyLink = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://t.me/outhcinax_bot/cinema?startapp=room_${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ رابط الغرفة للمشاركة');
  };

  const handleJoin = (roomId: string) => {
    if (onJoinRoom) {
      onJoinRoom(roomId);
    } else {
      window.dispatchEvent(new CustomEvent('telegram:join-room', { detail: { roomId } }));
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-32 animate-fade-in" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <i className="fa-solid fa-users text-alex-primary text-lg sm:text-xl"></i>
            <span>غرف المشاهدة الجماعية</span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            شاهد وتحدث مع أصدقائك في الوقت الفعلي
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchActiveRooms();
            if (isSignedIn || user) fetchUserRooms();
          }}
          title="تحديث الغرف"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-200 text-sm border border-white/15 cursor-pointer shadow-md transition-all"
        >
          <i className="fa-solid fa-rotate-right"></i>
        </button>
      </div>

      {/* Create Room Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-alex-primary/20 via-[#121929] to-[#0e1424] border border-alex-primary/30 flex items-center justify-between gap-3 shadow-xl">
        <div className="overflow-hidden">
          <h3 className="text-sm sm:text-base font-black text-white mb-0.5">أنشئ غرفة مشاهدة جديدة</h3>
          <p className="text-[11px] sm:text-xs text-gray-300 font-medium truncate">ادعُ أصدقاءك لمشاهدة أي فيلم في نفس اللحظة</p>
        </div>
        <CreateRoomButton onCreated={(roomId) => handleJoin(roomId)} />
      </div>

      {/* Premium Segmented Capsule Tabs Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#0c1220] p-1.5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-1.5 flex-1">
          {/* Tab 1: Active Rooms */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('active');
              setIsSelectionMode(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-red-600 to-alex-primary text-white shadow-[0_2px_12px_rgba(229,9,20,0.4)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-fire text-amber-400 text-xs"></i>
            <span>الرومات النشطة</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'active' ? 'bg-black/30 text-white' : 'bg-white/10 text-gray-300'
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none ${
              activeTab === 'my_rooms'
                ? 'bg-gradient-to-r from-red-600 to-alex-primary text-white shadow-[0_2px_12px_rgba(229,9,20,0.4)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-user text-sky-400 text-xs"></i>
            <span>روماتي</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'my_rooms' ? 'bg-black/30 text-white' : 'bg-white/10 text-gray-300'
            }`}>
              {userRooms.length}
            </span>
          </button>
        </div>

        {/* Selection Mode Toggle Button */}
        {activeTab === 'my_rooms' && userRooms.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setIsSelectionMode((prev) => !prev);
              if (isSelectionMode) setSelectedRoomIds([]);
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isSelectionMode
                ? 'border-red-500/60 bg-red-500/20 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <i className={`fa-solid ${isSelectionMode ? 'fa-xmark' : 'fa-list-check'} text-xs`}></i>
            <span>{isSelectionMode ? 'إلغاء التحديد' : 'تحديد الغرف'}</span>
          </button>
        )}
      </div>

      {/* Batch Control Action Bar (When in selection mode) */}
      {activeTab === 'my_rooms' && isSelectionMode && userRooms.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-red-500/30 bg-[#121827]/95 shadow-xl animate-fade-in">
          <div
            onClick={toggleSelectAll}
            className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-white select-none group"
          >
            {/* Custom Telegram-Style Checkbox */}
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                isAllSelected
                  ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]'
                  : 'border-white/30 bg-black/40 text-transparent group-hover:border-white/50'
              }`}
            >
              <i className="fa-solid fa-check text-[10px] font-black"></i>
            </div>
            <span>تحديد الكل ({userRooms.length})</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] sm:text-xs text-red-300 font-bold">
              محدد: <strong className="text-white font-mono">{selectedRoomIds.length}</strong>
            </span>
            <button
              type="button"
              disabled={selectedRoomIds.length === 0}
              onClick={() => setShowConfirmModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <i className="fa-solid fa-trash-can text-xs"></i>
              <span>حذف المحددة</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: ACTIVE PUBLIC ROOMS */}
      {activeTab === 'active' && (
        <>
          {loadingActive && (
            <div className="flex justify-center py-14">
              <div className="w-10 h-10 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loadingActive && activeRooms.length === 0 && (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl text-gray-500 mb-1">
                <i className="fa-solid fa-door-closed"></i>
              </div>
              <p className="font-black text-gray-200 text-base">لا توجد غرف عامة نشطة حالياً</p>
              <span className="text-xs text-gray-400 font-medium">كن أول من ينشئ غرفة مشاهدة الآن!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleJoin(room.id)}
                className="p-3 sm:p-3.5 rounded-2xl bg-[#0e1424] hover:bg-[#12192c] border border-white/10 hover:border-alex-primary/40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-lg group"
              >
                {/* Poster & Info */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative w-14 h-18 sm:w-15 sm:h-20 rounded-xl overflow-hidden bg-[#1a233a] flex-shrink-0 border border-white/15 shadow-md">
                    {room.moviePoster ? (
                      <Image
                        src={getImageUrl(room.moviePoster, 'poster') || '/icon.svg'}
                        alt={room.movieTitle || 'Movie'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">
                        <i className="fa-solid fa-film" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-black text-white truncate max-w-[150px] sm:max-w-xs group-hover:text-red-400 transition-colors">
                      {room.title}
                    </h4>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {room.movieTitle || 'فيلم مباشر'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] text-emerald-400 font-black">مباشر</span>
                      {room.host?.name && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[90px]">
                          • {room.host.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Cluster */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(room.id, e)}
                    title="مشاركة الرابط"
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/30 border border-white/10 active:scale-95 flex items-center justify-center text-gray-300 text-xs transition cursor-pointer"
                  >
                    <i className="fa-solid fa-share-nodes"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJoin(room.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-alex-primary hover:from-red-500 hover:to-red-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(229,9,20,0.35)] cursor-pointer"
                  >
                    <span>دخول</span>
                    <i className="fa-solid fa-arrow-left text-[9px]"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TAB 2: MY CREATED ROOMS */}
      {activeTab === 'my_rooms' && (
        <>
          {loadingUser && (
            <div className="flex justify-center py-14">
              <div className="w-10 h-10 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loadingUser && userRooms.length === 0 && (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl text-gray-500 mb-1">
                <i className="fa-solid fa-folder-open"></i>
              </div>
              <p className="font-black text-gray-200 text-base">لم تقم بإنشاء أي غرف مشاهدة بعد</p>
              <span className="text-xs text-gray-400 font-medium">
                اضغط على زر (أنشئ غرفة مشاهدة جديدة) بالأعلى لإنشاء غرفتك الخاصة!
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userRooms.map((room) => {
              const isSelected = selectedRoomIds.includes(room.id);
              return (
                <div
                  key={room.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectRoom(room.id);
                    } else {
                      handleJoin(room.id);
                    }
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl bg-[#0e1424] hover:bg-[#12192c] border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-lg ${
                    isSelected
                      ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Checkbox / Poster / Details */}
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {isSelectionMode && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectRoom(room.id);
                        }}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(229,9,20,0.5)] scale-105'
                            : 'border-white/30 bg-black/40 text-transparent hover:border-white/50'
                        }`}
                      >
                        <i className="fa-solid fa-check text-[10px] font-black"></i>
                      </div>
                    )}

                    <div className="relative w-14 h-18 sm:w-15 sm:h-20 rounded-xl overflow-hidden bg-[#1a233a] flex-shrink-0 border border-white/15 shadow-md">
                      {room.moviePoster ? (
                        <Image
                          src={getImageUrl(room.moviePoster, 'poster') || '/icon.svg'}
                          alt={room.movieTitle || 'Movie'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">
                          <i className="fa-solid fa-film" />
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <h4 className="text-sm font-black text-white truncate max-w-[130px] sm:max-w-xs">
                        {room.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {room.movieTitle || 'فيلم مباشر'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-bold border border-sky-500/30 flex items-center gap-1">
                          <i className="fa-solid fa-crown text-amber-400 text-[10px]" />
                          <span>غرفتك</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Cluster */}
                  {!isSelectionMode && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(room.id, e)}
                        title="مشاركة الرابط"
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/30 border border-white/10 active:scale-95 flex items-center justify-center text-gray-300 text-xs transition cursor-pointer"
                      >
                        <i className="fa-solid fa-share-nodes"></i>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingleRoom(room.id, e)}
                        title="حذف الغرفة"
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-white/10 active:scale-95 flex items-center justify-center text-gray-300 text-xs transition cursor-pointer"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleJoin(room.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-alex-primary hover:from-red-500 hover:to-red-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1 shadow-[0_2px_8px_rgba(229,9,20,0.35)] cursor-pointer"
                      >
                        <span>دخول</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmation Modal for Batch Deletion */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-[#0e1424] p-6 text-center shadow-2xl animate-scale-up">
            <div className="w-13 h-13 mx-auto mb-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl text-red-500 shadow-lg">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-base font-black text-white mb-1.5">تأكيد حذف الغرف</h3>
            <p className="text-xs text-gray-300 mb-5 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف <strong className="text-white font-bold">{selectedRoomIds.length}</strong> غرفة محددة؟ لن تتمكن من استرجاعها بعد الحذف.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleBatchDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black transition cursor-pointer"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition cursor-pointer"
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
