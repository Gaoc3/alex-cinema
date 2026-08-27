'use client';

import React, { useState, useEffect } from 'react';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpShortcutsModal({ isOpen, onClose }: HelpShortcutsModalProps) {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'rooms' | 'telegram'>('shortcuts');

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      {/* Translucent Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in" 
      />

      {/* Modal Container */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-[#080d1a]/95 text-white shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_50px_rgba(229,9,20,0.25)] backdrop-blur-2xl animate-scaleIn flex flex-col max-h-[90vh]"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 size-60 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 sm:px-8 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-red-500/30 bg-red-600/15 text-red-400 shadow-[0_0_20px_rgba(229,9,20,0.3)]">
              <i className="fa-solid fa-circle-question text-xl" />
            </div>
            <div>
              <h2 id="help-modal-title" className="text-lg sm:text-xl font-black text-white">دليل الاستخدام والاختصارات</h2>
              <p className="text-xs text-slate-400 font-medium">كل ما تحتاجه لتجربة سينمائية متكاملة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/15 hover:text-white active:scale-95"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 bg-black/20 px-5 sm:px-8 pt-3 gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'shortcuts'
                ? 'border-red-500 text-white shadow-[0_2px_10px_rgba(229,9,20,0.5)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-keyboard" />
            <span>اختصارات المشغل</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rooms'
                ? 'border-red-500 text-white shadow-[0_2px_10px_rgba(229,9,20,0.5)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-users" />
            <span>غرف المشاهدة المتزامنة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-2 pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'telegram'
                ? 'border-red-500 text-white shadow-[0_2px_10px_rgba(229,9,20,0.5)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fa-brands fa-telegram text-sky-400" />
            <span>تطبيق تيليجرام</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-right">
          {activeTab === 'shortcuts' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
              {[
                { key: 'Space / K', label: 'تشغيل / إيقاف مؤقت', desc: 'للتحكم الفوري ببدء وإيقاف العرض' },
                { key: 'F', label: 'ملء الشاشة', desc: 'تكبير المشغل إلى كامل الشاشة' },
                { key: 'M', label: 'كتم الصوت', desc: 'تشغيل أو كتم الصوت بسرعة' },
                { key: '→ / ←', label: 'تقديم / تأخير 10ث', desc: 'تخطي المشاهد أو إعادتها بدقة' },
                { key: '↑ / ↓', label: 'رفع / خفض الصوت', desc: 'تعديل مستوى الصوت تدريجياً' },
                { key: 'Esc', label: 'إغلاق النوافذ', desc: 'إغلاق أي قائمة أو نافذة منبثقة' },
              ].map((item) => (
                <div 
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 hover:border-white/20 transition-all"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">{item.label}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <kbd className="rounded-xl border border-red-500/30 bg-red-600/15 px-2.5 py-1 text-xs font-mono font-black text-red-400 shadow-sm" dir="ltr">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4.5 space-y-2">
                <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
                  <i className="fa-solid fa-bolt" />
                  <span>المزامنة اللحظية (Zero-Lag WebSockets)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  تتيح لك غرف المشاهدة متابعة الأفلام والمسلسلات مع أصدقائك في نفس الثانية؛ عند قيام المضيف بالتشغيل أو التقديم أو التوقف، يتم تحديث المشغل لدى كافة الحضور فوراً.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4.5 space-y-2">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                  <i className="fa-solid fa-crown" />
                  <span>صلاحيات المضيف والمشرفين</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  يملك مضيف الغرفة التحكم الكامل بتغيير العمل المعروض وإدارة صلاحيات المشرفين (مثل صلاحية التقديم/التأخير والتحكم بالتشغيل) وطرد الأعضاء غير المرغوب بهم.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4.5 space-y-2">
                <div className="flex items-center gap-2.5 text-sky-400 font-bold text-sm">
                  <i className="fa-solid fa-comments" />
                  <span>مجلس الغرفة والتفاعلات الحية</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  يمكنك إرسال الرسائل الفورية والتفاعل مع الأحداث باستخدام الإيموجيات العائمة (🍿 🔥 ❤️ 👏) وتظهر فوراً على شاشات جميع المتواجدين.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-2.5">
                <div className="flex items-center gap-2.5 text-sky-400 font-bold text-sm">
                  <i className="fa-brands fa-telegram text-lg" />
                  <span>التشغيل الفوري عبر بوت تيليجرام</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  يمكنك فتح المنصة ومتابعة الغرف مباشرة من داخل تطبيق تيليجرام عبر تيليجرام ميني آب (Telegram Mini App) مع تسجيل دخول فوري وآمن ببروفايلك وصورتك الرسمية.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-black/40 p-4 sm:px-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            فهمت، إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
}
