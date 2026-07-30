"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { toast } from 'react-hot-toast';
import { DEFAULT_ROOM_TITLE, MAX_ROOM_TITLE_LENGTH, normalizeRoomTitle } from '@/lib/roomTitle';

export default function CreateRoomButton({ className }: { className?: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const router = useRouter();
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUnifiedAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isCreatingRef = useRef(isCreating);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    isCreatingRef.current = isCreating;
  }, [isCreating]);

  useEffect(() => {
    if (!isDialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    const triggerButton = triggerRef.current;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreatingRef.current) setIsDialogOpen(false);
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      const focusable = dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        : [];
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', closeOnEscape);
      window.requestAnimationFrame(() => triggerButton?.focus());
    };
  }, [isDialogOpen]);

  const openCreateDialog = (event: React.MouseEvent) => {
    event.preventDefault();
    if (isCreating) return;

    if (!isSignedIn && !user) {
      toast.error('يجب تسجيل الدخول لإنشاء غرفة مشاهدة 🔒');
      return;
    }

    setIsDialogOpen(true);
  };

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    const toastId = toast.loading('جاري إنشاء غرفة المشاهدة...');

    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: normalizeRoomTitle(roomName),
          isPrivate: false
        })
      });

      const data = await response.json();
      toast.dismiss(toastId);

      if (data.success && (data.room?.id || data.roomId)) {
        setIsDialogOpen(false);
        toast.success('تم إنشاء الغرفة بنجاح! 🍿');
        const roomId = data.room?.id || data.roomId;
        router.push(`/room/${roomId}?create=true`);
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إنشاء الغرفة');
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('فشل الاتصال أثناء إنشاء الغرفة');
    } finally {
      setIsCreating(false);
    }
  };

  const remainingCharacters = MAX_ROOM_TITLE_LENGTH - roomName.length;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openCreateDialog}
        disabled={isCreating}
        className={className || "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black px-5 py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(229,9,20,0.5)] border border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"}
      >
        <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
        <i className="fa-solid fa-users text-sm" aria-hidden="true" />
        <span>إنشاء غرفة جديدة</span>
      </button>

      {isDialogOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-lg"
          dir="rtl"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreating) setIsDialogOpen(false);
          }}
        >
          <form
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onSubmit={handleCreateRoom}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0d1322] p-6 text-right shadow-2xl sm:p-8"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400">
                <i className="fa-solid fa-users" aria-hidden="true" />
              </span>
              <div>
                <h2 id={titleId} className="text-xl font-black text-white">سمِّ غرفة المشاهدة</h2>
                <p id={descriptionId} className="mt-1 text-xs leading-5 text-slate-400">يمكنك ترك الحقل فارغًا لاستخدام الاسم الافتراضي.</p>
              </div>
            </div>

            <label htmlFor={`${titleId}-input`} className="mb-2 block text-sm font-bold text-slate-200">اسم الغرفة</label>
            <input
              ref={inputRef}
              id={`${titleId}-input`}
              type="text"
              value={roomName}
              maxLength={MAX_ROOM_TITLE_LENGTH}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder={DEFAULT_ROOM_TITLE}
              autoComplete="off"
              className="min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white placeholder:text-slate-600 focus:border-red-500/60 focus:outline-none focus:ring-2 focus:ring-red-500/25"
            />
            <p className="mt-2 text-left text-[11px] text-slate-500" aria-live="polite">
              {remainingCharacters} حرفًا متبقيًا
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setIsDialogOpen(false)}
                className="min-h-11 cursor-pointer rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >إلغاء</button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e50914] px-6 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isCreating ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <i className="fa-solid fa-plus" aria-hidden="true" />}
                {isCreating ? 'جارٍ الإنشاء...' : 'إنشاء الغرفة'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
