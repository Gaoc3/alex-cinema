"use client";

import { usePathname } from 'next/navigation';
import React from 'react';

export default function ConditionalFooter() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/sign-in')
    || pathname?.startsWith('/sign-up')
    || pathname?.startsWith('/tg-app')
    || pathname?.startsWith('/room/');

  if (isAuthPage) {
    return null;
  }

  return (
    <footer className="border-t border-white/5 bg-[#090a0f] py-6 text-center text-xs text-[#94a3b8] mt-auto relative z-10 xl:pr-20">
      <p>© {new Date().getFullYear()} ALEX CINEMA. جميع الحقوق محفوظة.</p>
      <div className="mt-2 flex justify-center gap-4 opacity-60">
        <span className="hover:text-white cursor-pointer transition-colors">سياسة الخصوصية</span>
        <span className="hover:text-white cursor-pointer transition-colors">شروط الخدمة</span>
        <span className="hover:text-white cursor-pointer transition-colors">اتصل بنا</span>
      </div>
    </footer>
  );
}
