'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageHelper';
import CreateRoomButton from '@/components/CreateRoomButton';
import UserAvatar from '@/components/UserAvatar';

interface ActiveRoom {
  id: string;
  title: string;
  movieTitle: string | null;
  moviePoster: string | null;
  host: {
    name: string | null;
    imageUrl: string | null;
  } | null;
}

interface RoomsListClientProps {
  initialRooms: ActiveRoom[];
  loadError: string | null;
}

export default function RoomsListClient({ initialRooms, loadError }: RoomsListClientProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<ActiveRoom[]>(initialRooms);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const allRoomIds = rooms.map((r) => r.id);
  const isAllSelected = rooms.length > 0 && selectedRoomIds.length === rooms.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(allRoomIds);
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
        setRooms((prev) => prev.filter((r) => !selectedRoomIds.includes(r.id)));
        setSelectedRoomIds([]);
        setIsSelectionMode(false);
        setShowConfirmModal(false);
        router.refresh();
      } else {
        toast.error(result.error || 'تعذر حذف الغرف المحددة');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال أثناء حذف الغرف');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 xl:px-8 xl:pt-28" dir="rtl">
      {/* Header Bar */}
      <div className="mb-7 flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-5 sm:mb-8 sm:flex-row sm:items-center sm:pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-3 text-2xl font-black text-white drop-shadow-md sm:text-4xl">
              <i className="fa-solid fa-fire text-[#E50914] drop-shadow-[0_0_15px_rgba(229,9,20,0.6)] motion-safe:animate-pulse" aria-hidden="true" />
              الغرف النشطة
            </h1>
            {!loadError && rooms.length > 0 && (
              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">
                {rooms.length} {rooms.length === 1 ? 'غرفة' : 'غرف'}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">
            انضم إلى مشاهدة مباشرة مع الأصدقاء، وشارك اللحظة والدردشة في الوقت نفسه.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {rooms.length > 0 && !loadError && (
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode((prev) => !prev);
                if (isSelectionMode) setSelectedRoomIds([]);
              }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                isSelectionMode
                  ? 'border-red-500/50 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <i className={`fa-solid ${isSelectionMode ? 'fa-xmark' : 'fa-list-check'} text-sm`} aria-hidden="true" />
              <span>{isSelectionMode ? 'إلغاء التحديد' : 'تحديد الغرف'}</span>
            </button>
          )}
          <CreateRoomButton />
        </div>
      </div>

      {/* Batch Control Action Bar */}
      {isSelectionMode && rooms.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-500/30 bg-[#121827]/90 p-4 shadow-2xl backdrop-blur-md animate-fade-in-up">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-white select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="size-5 rounded border-white/20 bg-black/40 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
              />
              <span>تحديد الكل ({rooms.length})</span>
            </label>

            <span className="h-4 w-px bg-white/15" />

            <span className="text-xs font-bold text-slate-300">
              تم تحديد <strong className="text-white font-mono text-sm">{selectedRoomIds.length}</strong> غرفة
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={selectedRoomIds.length === 0}
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg cursor-pointer"
            >
              <i className="fa-solid fa-trash" aria-hidden="true" />
              <span>حذف المحدد ({selectedRoomIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Load Error State */}
      {loadError ? (
        <div role="alert" className="flex flex-col items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-950/15 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-2xl text-amber-300">
            <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-black text-white sm:text-2xl">تعذر تحميل الغرف الآن</h2>
          <p className="mb-6 mt-2 max-w-md text-sm font-semibold leading-6 text-slate-400">
            {loadError}
          </p>
          <a
            href="/rooms"
            className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            إعادة المحاولة
          </a>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0e1424]/80 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10 lg:p-16">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-2xl text-[#E50914] shadow-[0_0_30px_rgba(229,9,20,0.2)] sm:size-20 sm:text-3xl">
            <i className="fa-solid fa-tv" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-black text-white sm:text-2xl">لا توجد غرف عامة نشطة حاليًا</h2>
          <p className="mb-7 mt-2 max-w-md text-sm leading-6 text-slate-400">
            أنشئ غرفتك وابدأ مشاهدة فيلم أو مسلسل مع أصدقائك في لحظات.
          </p>
          <CreateRoomButton />
        </div>
      ) : (
        /* Rooms Grid */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 2xl:grid-cols-4">
          {rooms.map((room) => {
            const primaryTitle = room.movieTitle || room.title;
            const hasSecondaryTitle = room.movieTitle && room.title && room.movieTitle !== room.title;
            const isSelected = selectedRoomIds.includes(room.id);

            const CardWrapper = isSelectionMode ? 'div' : Link;
            const wrapperProps = isSelectionMode
              ? { onClick: () => toggleSelectRoom(room.id) }
              : { href: `/room/${room.id}` };

            return (
              <CardWrapper
                {...(wrapperProps as any)}
                key={room.id}
                className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <article
                  className={`relative flex min-h-60 cursor-pointer flex-col justify-end overflow-hidden rounded-3xl border bg-[#0e1424]/90 shadow-xl backdrop-blur-xl transition duration-300 sm:min-h-64 select-none ${
                    isSelected
                      ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.35)] scale-[1.02]'
                      : 'border-white/10 group-hover:-translate-y-1.5 group-hover:border-red-500/50 group-hover:shadow-[0_14px_40px_rgba(229,9,20,0.25)]'
                  }`}
                >
                  {/* Selection Mode Checkbox Indicator */}
                  {isSelectionMode && (
                    <div className="absolute top-3.5 left-3.5 z-30 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRoom(room.id)}
                        className="size-6 rounded-lg border-2 border-white/40 bg-black/60 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600 shadow-lg"
                      />
                    </div>
                  )}

                  {room.moviePoster ? (
                    <>
                      <Image
                        src={getImageUrl(room.moviePoster, 'backdrop')}
                        alt={primaryTitle ? `خلفية ${primaryTitle}` : ''}
                        fill
                        sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, (max-width: 1535px) 33vw, 25vw"
                        className="absolute inset-0 object-cover opacity-50 transition duration-500 group-hover:scale-105 group-hover:opacity-70"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#090d16]/85 to-black/5" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(229,9,20,0.18),transparent_38%),linear-gradient(135deg,#121929,#080b13_55%,#180a12)]" />
                  )}

                  <div className={`pointer-events-none absolute inset-x-3.5 top-3.5 z-20 flex items-center ${isSelectionMode ? 'justify-end' : 'justify-between'}`}>
                    {!isSelectionMode && (
                      <span className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-red-600/90 px-2.5 py-1 text-[0.68rem] font-black text-white shadow-[0_0_14px_rgba(229,9,20,0.45)] backdrop-blur-md">
                        <span className="size-2 rounded-full bg-white motion-safe:animate-pulse" />
                        مباشر
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1 text-[0.68rem] font-bold text-slate-100 backdrop-blur-md">
                      <i className="fa-solid fa-users text-[0.62rem] text-sky-400" aria-hidden="true" />
                      متاحة الآن
                    </span>
                  </div>

                  <div className="relative z-10 flex flex-col gap-2 p-5">
                    <p className="text-[0.68rem] font-black tracking-wide text-red-300">غرفة مشاهدة مباشرة</p>
                    <h2 className="line-clamp-2 text-lg font-black leading-7 text-white drop-shadow-md transition-colors group-hover:text-red-300">
                      {primaryTitle}
                    </h2>

                    {hasSecondaryTitle && (
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                        <i className="fa-solid fa-door-open text-[0.62rem] text-red-400" aria-hidden="true" />
                        <span className="line-clamp-1">{room.title}</span>
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          imageUrl={room.host?.imageUrl}
                          name={room.host?.name}
                          className="size-7 border border-white/20"
                        />
                        <span className="truncate text-xs font-bold text-slate-300">
                          بواسطة {room.host?.name || 'مستخدم أليكس'}
                        </span>
                      </div>

                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-600/90 text-xs text-white shadow-md transition group-hover:scale-110 group-hover:bg-red-500">
                        <i className="fa-solid fa-play translate-x-px text-[0.62rem]" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </article>
              </CardWrapper>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0d121d] p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-2xl text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-black text-white sm:text-2xl">تأكيد حذف الغرف</h3>
            <p className="my-4 text-sm leading-6 text-slate-300">
              هل أنت متأكد من رغبتك في حذف <strong className="text-red-400 font-mono text-base">{selectedRoomIds.length}</strong> غرفة بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleBatchDelete}
                className="w-1/2 rounded-xl bg-red-600 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-50 shadow-lg cursor-pointer"
              >
                {isDeleting ? 'جارٍ الحذف...' : 'نعم، احذف الغرف'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10 active:scale-95 disabled:opacity-50 cursor-pointer"
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
