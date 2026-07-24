'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moviesOpen, setMoviesOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-expand submenus based on pathname context (Zero-Legacy Context-Awareness)
  useEffect(() => {
    if (pathname.startsWith('/movies')) {
      setMoviesOpen(true);
    }
    if (pathname.startsWith('/series')) {
      setSeriesOpen(true);
    }
  }, [pathname]);
  
  // Local short screen check (Can optionally use global var, but keeping it here for reactivity on padding)
  const [layout, setLayout] = useState({ isShortScreen: false });

  useEffect(() => {
    const checkState = () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 1280;
        setIsCollapsed(isMobile ? false : document.body.classList.contains('sidebar-collapsed'));
        setLayout({
          isShortScreen: window.innerHeight < 750
        });
      }
    };

    checkState();

    window.addEventListener('sidebar-state-change', checkState);
    window.addEventListener('resize', checkState);
    window.addEventListener('orientationchange', checkState);

    // Periodic check to ensure state is synchronized even if class changes without events
    const interval = setInterval(checkState, 250);

    return () => {
      window.removeEventListener('sidebar-state-change', checkState);
      window.removeEventListener('resize', checkState);
      window.removeEventListener('orientationchange', checkState);
      clearInterval(interval);
    };
  }, []);

  const paddingClass = layout.isShortScreen ? 'py-2.5' : 'py-3.5';

  const isActive = (path: string) => {
    // If the path contains a query string
    if (path.includes('?')) {
      const [basePath, queryString] = path.split('?');
      if (pathname !== basePath) return false;
      
      const targetParams = new URLSearchParams(queryString);
      // Check if all target params exist in the current URL with the same value
      for (const [key, value] of targetParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    
    // Exact match for base path without query string
    // Special case for root '/'
    if (path === '/') return pathname === '/';
    
    // For other paths without query strings, just check if pathname matches
    return pathname === path && Array.from(searchParams.keys()).length === 0;
  };

  const closeSidebar = () => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('sidebar-open');
    }
  };

  const toggleSidebar = () => {
    if (typeof document !== 'undefined') {
      const isMobile = window.innerWidth < 1280;
      if (isMobile) {
        document.body.classList.toggle('sidebar-open');
      } else {
        const nextCollapsed = !document.body.classList.contains('sidebar-collapsed');
        if (nextCollapsed) {
          document.body.classList.add('sidebar-collapsed');
          localStorage.setItem('sidebar-collapsed', 'true');
          setIsCollapsed(true);
        } else {
          document.body.classList.remove('sidebar-collapsed');
          localStorage.setItem('sidebar-collapsed', 'false');
          setIsCollapsed(false);
        }
        window.dispatchEvent(new Event('sidebar-state-change'));
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        onClick={closeSidebar}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300 xl:hidden pointer-events-none opacity-0 sidebar-overlay"
        style={{ touchAction: 'none' }}
      />
      
      <aside 
        className="fixed top-0 right-0 w-72 z-[60] flex flex-col bg-[#06070a]/75 backdrop-blur-xl xl:bg-transparent xl:ios-glass sidebar overflow-hidden transition-[width,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-r-0 border-y-0 border-l border-white/[0.05] xl:border-l-0 rounded-none shadow-2xl xl:shadow-none h-screen" 
      >

        {/* Sidebar Header (Zero-Legacy Cinematic Style) */}
        <div className="h-20 shrink-0 border-b border-white/[0.03] flex items-center justify-between pr-5 pl-3 w-full relative z-20">
          
          {/* Logo and Brand Name (Hidden on Collapsed) */}
          <div className={`flex items-center gap-2.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-right ${isCollapsed ? 'opacity-0 max-w-0 overflow-hidden scale-90 pointer-events-none' : 'opacity-100 max-w-[300px] scale-100 delay-100'}`}>
            <Link href="/home" className="flex items-center gap-2.5 group" onClick={closeSidebar}>
              <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 border border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] group-hover:shadow-[0_2px_12px_rgba(229,9,20,0.25)]">
                <img src="/logo.svg" alt="AleX Cinema Logo" className="w-full h-full object-cover scale-[1.05]" />
              </div>
              <div className="flex flex-col leading-none font-sans">
                <span className="text-[17px] font-black font-en tracking-normal text-white">ALEX<span className="text-alex-primary">CINEMA</span></span>
                <span className="text-[9px] text-gray-500 font-bold tracking-[0.1em] mt-0.5 uppercase">Premium</span>
              </div>
            </Link>
          </div>

          {/* Hamburger toggle button (Hidden on Collapsed) */}
          <button 
            onClick={toggleSidebar}
            className={`shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all duration-300 cursor-pointer ${isCollapsed ? 'opacity-0 w-0 h-0 overflow-hidden scale-50 pointer-events-none' : 'opacity-100 w-10 h-10 scale-100 delay-100'}`}
            aria-label="Toggle Sidebar"
          >
            <span className="xl:hidden"><i className="fa-solid fa-xmark text-gray-300 text-lg"></i></span>
            <span className="hidden xl:inline-block"><i className="fa-solid fa-bars text-gray-300 text-base"></i></span>
          </button>

          {/* Centered logo button (Shown ONLY on Collapsed) */}
          <div className={`w-full flex justify-center items-center absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'opacity-100 scale-100 delay-150 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'}`}>
            <button 
              onClick={toggleSidebar}
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              title="Expand Sidebar"
            >
              <img src="/logo.svg" alt="AleX Cinema Logo" className="w-full h-full object-cover scale-[1.05]" />
            </button>
          </div>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar relative" style={{ WebkitOverflowScrolling: 'touch' }} dir="ltr">
          <div className={`px-4 ${layout.isShortScreen ? 'pt-3 pb-3' : 'pt-6 pb-6'} flex flex-col`} dir="rtl">
            <div className={`min-h-[${layout.isShortScreen ? '10px' : '16px'}]`} />
            {/* Navigation Section */}
            <div className="space-y-2.5">
            {/* الصفحة الرئيسية */}
            <Link 
              href="/home" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                isActive('/home') 
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-house text-lg w-5 text-center"></i>
                <span className="sidebar-label">الصفحة الرئيسية</span>
              </div>
            </Link>

            {/* الإصدارات الجديدة */}
            <Link 
              href="/new-releases" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                isActive('/new-releases')
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-fire text-lg w-5 text-center text-orange-500"></i>
                <span className="sidebar-label">الإصدارات الجديدة</span>
              </div>
            </Link>

            {/* المشهورة */}
            <Link 
              href="/movies?sort=stars" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                pathname === '/movies' && isActive('/movies?sort=stars')
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-star-half-stroke text-lg w-5 text-center text-yellow-400"></i>
                <span className="sidebar-label">المشهورة</span>
              </div>
            </Link>

            {/* الأفلام */}
            <div className="sidebar-submenu-container flex flex-col">
              <div className={`w-full flex items-center justify-between px-2 rounded-xl transition-all duration-200 active:scale-[0.97] ${
                isActive('/movies')
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}>
                <Link 
                  href="/movies"
                  onClick={closeSidebar}
                  className="flex items-center gap-3.5 sidebar-item-content flex-grow py-2 px-2"
                >
                  <i className="fa-solid fa-film text-lg w-5 text-center"></i>
                  <span className="sidebar-label text-[15px]">الأفلام</span>
                </Link>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    if (isCollapsed) {
                      toggleSidebar();
                      setMoviesOpen(true);
                    } else {
                      setMoviesOpen(!moviesOpen);
                    }
                  }}
                  className="px-3 py-2 cursor-pointer flex items-center justify-center hover:text-alex-primary transition-colors animate-fade-in"
                >
                  <i className={`fa-solid fa-chevron-left text-xs transition-transform duration-300 sidebar-label ${moviesOpen ? '-rotate-90' : ''}`}></i>
                </button>
              </div>
              
              {/* Movies Submenu */}
              <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] mr-8 space-y-1 mt-1 sidebar-submenu origin-top ${moviesOpen && !isCollapsed ? 'max-h-40 opacity-100 translate-y-0 scale-y-100' : 'max-h-0 opacity-0 -translate-y-2 scale-y-95 pointer-events-none'}`}>
                <Link href="/movies" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/movies') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>كل الأفلام</Link>
                <Link href="/movies?sort=stars" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/movies?sort=stars') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>الأعلى تقييماً</Link>
                <Link href="/movies?category=84" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/movies?category=84') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>أفلام أكشن</Link>
              </div>
            </div>

            {/* المسلسلات */}
            <div className="sidebar-submenu-container flex flex-col">
              <div className={`w-full flex items-center justify-between px-2 rounded-xl transition-all duration-200 active:scale-[0.97] ${
                isActive('/series')
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}>
                <Link 
                  href="/series"
                  onClick={closeSidebar}
                  className="flex items-center gap-3.5 sidebar-item-content flex-grow py-2 px-2"
                >
                  <i className="fa-solid fa-tv text-lg w-5 text-center"></i>
                  <span className="sidebar-label text-[15px]">المسلسلات</span>
                </Link>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    if (isCollapsed) {
                      toggleSidebar();
                      setSeriesOpen(true);
                    } else {
                      setSeriesOpen(!seriesOpen);
                    }
                  }}
                  className="px-3 py-2 cursor-pointer flex items-center justify-center hover:text-alex-primary transition-colors animate-fade-in"
                >
                  <i className={`fa-solid fa-chevron-left text-xs transition-transform duration-300 sidebar-label ${seriesOpen ? '-rotate-90' : ''}`}></i>
                </button>
              </div>
              
              {/* Series Submenu */}
              <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] mr-8 space-y-1 mt-1 sidebar-submenu origin-top ${seriesOpen && !isCollapsed ? 'max-h-40 opacity-100 translate-y-0 scale-y-100' : 'max-h-0 opacity-0 -translate-y-2 scale-y-95 pointer-events-none'}`}>
                <Link href="/series" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/series') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>كل المسلسلات</Link>
                <Link href="/series?sort=stars" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/series?sort=stars') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>الأعلى تقييماً</Link>
                <Link href="/series?category=62" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/series?category=62') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>مسلسلات دراما</Link>
              </div>
            </div>

            {/* انمي */}
            <Link 
              href="/series?category=57" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                isActive('/series?category=57') 
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-fire-flame-curved text-lg w-5 text-center text-red-500"></i>
                <span className="sidebar-label">انمي</span>
              </div>
            </Link>

            {/* أحدث الحلقات */}
            <Link 
              href="/series?view=episodes" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                isActive('/series?view=episodes') 
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-clock text-lg w-5 text-center text-sky-400"></i>
                <span className="sidebar-label">أحدث الحلقات</span>
              </div>
            </Link>

            {/* الانمي */}
            <Link 
              href="/movies?category=23" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                isActive('/movies?category=23') 
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-dragon text-lg w-5 text-center text-orange-400"></i>
                <span className="sidebar-label">الأنمي</span>
              </div>
            </Link>

            {/* المصارعة الحرة */}
            <Link 
              href="/movies?category=63" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                isActive('/movies?category=63') 
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-mask text-lg w-5 text-center text-red-400"></i>
                <span className="sidebar-label">المصارعة الحرة (رياضي)</span>
              </div>
            </Link>

            {/* الأطفال والكرتون */}
            <Link 
              href="/movies?category=57" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-200 active:scale-[0.97] sidebar-link-btn ${
                isActive('/movies?category=57') 
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-child text-lg w-5 text-center text-green-400"></i>
                <span className="sidebar-label">الأطفال والكرتون</span>
              </div>
            </Link>
          </div>
          <div className="h-6 shrink-0 w-full" />
          </div>
        </div>
      </aside>
    </>
  );
}
