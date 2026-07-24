"use client";

import React from 'react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn" dir="rtl">
      <div 
        className="bg-[#0d1322]/95 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(229,9,20,0.25)] relative overflow-hidden text-right transform transition-all scale-100"
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
            <h3 className="text-white font-black text-lg sm:text-xl">{title}</h3>
            <p className="text-gray-400 text-xs font-medium mt-0.5">تأكيد قبل متابعة التنفيذ</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-200 text-sm leading-relaxed mb-6 font-medium bg-white/5 p-3.5 rounded-2xl border border-white/5">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2 ${
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
