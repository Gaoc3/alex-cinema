"use client";

import React, { useEffect, useId, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "تأكيد الإجراء",
  cancelText = "إلغاء",
  isDangerous = true,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => cancelButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-fadeIn"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div 
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="relative w-full max-w-md scale-100 overflow-hidden rounded-3xl border border-white/15 bg-[#0d1322]/95 p-6 text-right shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(229,9,20,0.25)] transition-all sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glowing Gradient Line */}
        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${isDangerous ? 'from-red-600 via-rose-500 to-red-700' : 'from-sky-500 to-indigo-600'}`}></div>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${isDangerous ? 'bg-red-500/15 border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(229,9,20,0.4)]' : 'bg-sky-500/15 border-sky-500/30 text-sky-400'}`}>
            <i className={`fa-solid ${isDangerous ? 'fa-triangle-exclamation' : 'fa-circle-info'} text-xl`}></i>
          </div>
          <div>
            <h3 id={titleId} className="text-white font-black text-lg sm:text-xl">{title}</h3>
            <p className="text-gray-400 text-xs font-medium mt-0.5">تأكيد قبل متابعة التنفيذ</p>
          </div>
        </div>

        {/* Message */}
        <p id={messageId} className="text-gray-200 text-sm leading-relaxed mb-6 font-medium bg-white/5 p-3.5 rounded-2xl border border-white/5">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 cursor-pointer rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-95"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black text-white shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-95 ${
              isDangerous 
                ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border border-white/20 shadow-[0_4px_20px_rgba(229,9,20,0.5)]' 
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 border border-white/20'
            }`}
          >
            <i className="fa-solid fa-check text-xs"></i>
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
