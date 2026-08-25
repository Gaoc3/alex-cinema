"use client";

import { usePathname } from 'next/navigation';
import React, { Suspense } from 'react';
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SidebarToggle from "@/components/SidebarToggle";
import CinematicLogo from "@/components/CinematicLogo";
import UserNav from "@/components/UserNav";
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUnifiedAuth();
  const isAuthPage = pathname?.startsWith('/sign-in')
    || pathname?.startsWith('/sign-up')
    || pathname?.startsWith('/tg-app')
    || pathname?.startsWith('/room/');

  if (isAuthPage) return null;

  return (
    <>
      <nav 
        className="fixed top-0 left-0 right-0 w-full max-w-[100vw] box-border z-40 transition-all duration-500 pointer-events-auto pt-2 sm:pt-4 xl:pt-6 pb-2 sm:pb-4" 
        id="navbar"
        style={{
          paddingInlineStart: 'max(12px, env(safe-area-inset-left))',
          paddingInlineEnd: 'max(12px, env(safe-area-inset-right))',
        }}
      >
        <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-6 xl:px-8 box-border">
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16 xl:h-16 px-1 sm:px-4 box-border relative w-full min-w-0">
              
              {/* Right side (RTL Start): Logo & Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 z-10 shrink-0">
                  {/* Hamburger toggle on mobile */}
                  <div className="xl:hidden flex items-center shrink-0">
                      <SidebarToggle />
                  </div>
                  
                  <Link href="/" className="flex items-center group shrink-0">
                      <CinematicLogo />
                  </Link>
              </div>

              {/* Desktop Center Spacer */}
              <div className="hidden xl:block flex-grow"></div>

              {/* Left side (RTL End): Search Input & User Actions */}
              <div className="flex items-center justify-end gap-2 sm:gap-4">
                  <div className="flex items-center shrink-0">
                      <Suspense fallback={<div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse"></div>}>
                          <SearchBar />
                      </Suspense>
                  </div>
                  
                  <div className="flex items-center shrink-0 ms-auto min-h-[40px]">
                       {!isLoaded ? (
                         <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>
                       ) : isSignedIn ? (
                         <UserNav />
                       ) : (
                         <Link 
                           href="/sign-in" 
                           aria-label="تسجيل الدخول"
                           className="flex size-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-red-500/50 bg-[#e50914] text-xs font-extrabold text-white shadow-[0_4px_18px_rgba(229,9,20,0.5)] transition-all duration-300 hover:scale-[1.03] hover:bg-[#b91c1c] hover:shadow-[0_6px_25px_rgba(229,9,20,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-95 min-[430px]:w-auto min-[430px]:px-3 sm:min-h-[40px] sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
                         >
                             <i className="fa-solid fa-right-to-bracket text-xs"></i>
                             <span className="hidden min-[430px]:inline">تسجيل الدخول</span>
                         </Link>
                       )}
                  </div>
              </div>
          </div>
        </div>
      </nav>
      <script dangerouslySetInnerHTML={{
        __html: `
          window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            if(nav) {
              if (window.scrollY > 20) {
                nav.classList.add('bg-[#06070a]/90', 'backdrop-blur-2xl', 'shadow-2xl', 'border-b', 'border-white/[0.03]', 'pt-0', 'sm:pt-0', 'xl:pt-0');
                nav.classList.remove('pt-2', 'sm:pt-4', 'xl:pt-6');
              } else {
                nav.classList.remove('bg-[#06070a]/90', 'backdrop-blur-2xl', 'shadow-2xl', 'border-b', 'border-white/[0.03]', 'pt-0', 'sm:pt-0', 'xl:pt-0');
                nav.classList.add('pt-2', 'sm:pt-4', 'xl:pt-6');
              }
            }
          });
        `
      }} />
    </>
  );
}
