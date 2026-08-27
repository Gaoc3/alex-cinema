"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { createPortal } from 'react-dom';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { toast } from 'react-hot-toast';
import { DEFAULT_ROOM_TITLE, MAX_ROOM_TITLE_LENGTH, normalizeRoomTitle } from '@/lib/roomTitle';
import { isTelegramWebAppContext } from '@/lib/telegramWebAppClient';

interface CreateRoomButtonProps {
  className?: string;
  onCreated?: (roomId: string) => void;
}

export default function CreateRoomButton({ className, onCreated }: CreateRoomButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [dialogViewport, setDialogViewport] = useState({ top: '0px', height: '100dvh' });
  const router = useRouter();
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUnifiedAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
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
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const triggerButton = triggerRef.current;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';

    const visualViewport = window.visualViewport;
    const syncViewport = () => {
      const nextTop = `${Math.max(0, Math.round(visualViewport?.offsetTop ?? 0))}px`;
      const nextHeight = `${Math.max(1, Math.round(visualViewport?.height ?? window.innerHeight))}px`;
      setDialogViewport((current) => (
        current.top === nextTop && current.height === nextHeight
          ? current
          : { top: nextTop, height: nextHeight }
      ));
    };

    syncViewport();
    visualViewport?.addEventListener('resize', syncViewport);
    visualViewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);

    const frame = window.requestAnimationFrame(() => {
      const shouldOpenKeyboard = window.matchMedia('(min-width: 640px) and (pointer: fine)').matches;
      if (shouldOpenKeyboard) {
        inputRef.current?.focus({ preventScroll: true });
      } else {
        dialogRef.current?.focus({ preventScroll: true });
      }
    });
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
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
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
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      document.documentElement.style.overflow = previousDocumentOverflow;
      window.cancelAnimationFrame(frame);
      visualViewport?.removeEventListener('resize', syncViewport);
      visualViewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      document.removeEventListener('keydown', closeOnEscape);
      window.requestAnimationFrame(() => triggerButton?.focus());
    };
  }, [isDialogOpen]);

  const openCreateDialog = (event: React.MouseEvent) => {
    event.preventDefault();
    if (isCreating) return;

    if (!isSignedIn && !user) {
      toast.error('يجب تسجيل الدخول لإنشاء غرفة مشاهدة');
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
        setRoomName('');
        toast.success('تم إنشاء الغرفة بنجاح');
        const roomId = data.room?.id || data.roomId;
        if (onCreated) {
          onCreated(roomId);
        } else if (typeof window !== 'undefined' && window.location.pathname.startsWith('/tg-app')) {
          window.dispatchEvent(new CustomEvent('telegram:join-room', { detail: { roomId } }));
        } else {
          router.push(`/room/${roomId}?create=true`);
        }
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

  const dialog = isDialogOpen && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-lg p-4 sm:p-6"
        dir="rtl"
        onPointerDown={(event) => {
          const target = event.target as Node;
          if (!dialogRef.current?.contains(target) && !isCreating) setIsDialogOpen(false);
        }}
      >
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onSubmit={handleCreateRoom}
          className="m-auto w-full max-w-md shrink-0 overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#0d1322] p-5 text-right shadow-2xl outline-none sm:rounded-3xl sm:p-8"
        >
            <div className="mb-4 flex min-w-0 items-center gap-3 sm:mb-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400 sm:size-12">
                <i className="fa-solid fa-users" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="break-words text-lg font-black leading-7 text-white sm:text-xl">سمِّ غرفة المشاهدة</h2>
                <p id={descriptionId} className="mt-0.5 break-words text-xs leading-5 text-slate-400 sm:mt-1">يمكنك ترك الحقل فارغًا لاستخدام الاسم الافتراضي.</p>
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
              onFocus={() => {
                window.requestAnimationFrame(() => inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
              }}
              placeholder={DEFAULT_ROOM_TITLE}
              autoComplete="off"
              enterKeyHint="done"
              className="min-h-12 w-full min-w-0 rounded-xl border border-white/10 bg-black/25 px-4 text-base font-bold text-white placeholder:text-slate-600 focus:border-red-500/60 focus:outline-none focus:ring-2 focus:ring-red-500/25 sm:text-sm"
            />
            <p className="mt-2 text-xs text-slate-500" aria-live="polite">
              {remainingCharacters} حرفًا متبقيًا
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2.5 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setIsDialogOpen(false)}
                className="min-h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-slate-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto"
              >إلغاء</button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e50914] px-6 text-sm font-black text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-wait disabled:opacity-60 sm:min-h-11 sm:w-auto"
              >
                {isCreating ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <i className="fa-solid fa-plus" aria-hidden="true" />}
                {isCreating ? 'جارٍ الإنشاء...' : 'إنشاء الغرفة'}
              </button>
            </div>
          </form>
      </div>,
      document.body
    )
    : null;

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

      {dialog}
    </>
  );
}
