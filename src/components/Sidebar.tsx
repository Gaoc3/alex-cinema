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

  useEffect(() => {
    const checkState = () => {
      if (typeof document !== 'undefined') {
        setIsCollapsed(document.body.classList.contains('sidebar-collapsed'));
      }
    };

    checkState();

    window.addEventListener('sidebar-state-change', checkState);
    window.addEventListener('resize', checkState);

    // Periodic check to ensure state is synchronized even if class changes without events
    const interval = setInterval(checkState, 250);

    return () => {
      window.removeEventListener('sidebar-state-change', checkState);
      window.removeEventListener('resize', checkState);
      clearInterval(interval);
    };
  }, []);

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
      const isMobile = window.innerWidth < 1024;
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300 lg:hidden pointer-events-none opacity-0 sidebar-overlay"
      />
      
      <aside className="fixed top-0 right-0 h-screen w-72 z-[60] ios-glass flex flex-col sidebar overflow-hidden transition-[width,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-r-0 border-y-0 rounded-none">

        {/* Sidebar Header (Cinemana Style) */}
        <div className="h-24 border-b border-white/5 flex items-center justify-between pr-5 pl-3 w-full shrink-0 relative z-20">
          
          {/* Logo and Brand Name (Hidden on Collapsed) */}
          <div className={`flex items-center gap-2.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-right ${isCollapsed ? 'opacity-0 max-w-0 overflow-hidden scale-90 pointer-events-none' : 'opacity-100 max-w-[300px] scale-100 delay-100'}`}>
            <Link href="/" className="flex items-center gap-2.5 group" onClick={closeSidebar}>
              <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(229,9,20,0.3)] group-hover:shadow-[0_0_25px_rgba(229,9,20,0.5)] border border-white/10">
                <img src="/logo.svg" alt="AleX Cinema Logo" className="w-full h-full object-cover scale-[1.05]" />
              </div>
              <div className="flex flex-col leading-none font-sans">
                <span className="text-[19px] font-black font-en tracking-normal text-white">ALEX<span className="text-alex-primary">CINEMA</span></span>
                <span className="text-[10px] text-gray-500 font-bold tracking-[0.1em] mt-1 uppercase">Premium</span>
              </div>
            </Link>
          </div>

          {/* Hamburger toggle button (Hidden on Collapsed) */}
          <button 
            onClick={toggleSidebar}
            className={`shrink-0 rounded-xl glass-panel border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-alex-primary transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${isCollapsed ? 'opacity-0 w-0 h-0 overflow-hidden scale-50 pointer-events-none border-0' : 'opacity-100 w-10 h-10 scale-100 delay-100 hover-scale'}`}
            aria-label="Collapse Sidebar"
          >
            <i className="fa-solid fa-bars text-gray-300 text-base"></i>
          </button>

          {/* Centered logo button (Shown ONLY on Collapsed) */}
          <div className={`w-full flex justify-center items-center absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'opacity-100 scale-100 delay-150 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'}`}>
            <button 
              onClick={toggleSidebar}
              className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(229,9,20,0.3)] bg-black/40 border border-white/10"
              title="Expand Sidebar"
            >
              <img src="/logo.png" alt="AleX Cinema Logo" className="w-full h-full object-cover scale-[1.2]" />
            </button>
          </div>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-grow overflow-y-auto hide-scrollbar px-4 py-8 flex flex-col">
          <div className="flex-grow min-h-[20px]" /> {/* Top spacer */}
          {/* Navigation Section */}
          <div className="space-y-4">
            {/* الصفحة الرئيسية */}
            <Link 
              href="/" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold sidebar-link-btn ${
                isActive('/') 
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
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
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold sidebar-link-btn ${
                isActive('/new-releases')
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
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
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn ${
                pathname === '/movies' && isActive('/movies?sort=stars')
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-star-half-stroke text-lg w-5 text-center text-yellow-400"></i>
                <span className="sidebar-label">المشهورة</span>
              </div>
            </Link>

            {/* الأفلام */}
            <div className="sidebar-submenu-container">
              <button 
                onClick={() => !isCollapsed && setMoviesOpen(!moviesOpen)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5 sidebar-link-btn cursor-pointer"
              >
                <div className="flex items-center gap-3.5 sidebar-item-content">
                  <i className="fa-solid fa-film text-lg w-5 text-center"></i>
                  <span className="sidebar-label">الأفلام</span>
                </div>
                <i className={`fa-solid fa-chevron-left text-xs transition-transform duration-300 sidebar-label ${moviesOpen ? '-rotate-90' : ''}`}></i>
              </button>
              
              {/* Movies Submenu */}
              <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] mr-8 space-y-1 mt-1 sidebar-submenu origin-top ${moviesOpen && !isCollapsed ? 'max-h-40 opacity-100 translate-y-0 scale-y-100' : 'max-h-0 opacity-0 -translate-y-2 scale-y-95 pointer-events-none'}`}>
                <Link href="/movies" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-semibold transition-all ${isActive('/movies') ? 'text-alex-primary translate-x-[-4px]' : 'text-gray-400 hover:text-white hover:translate-x-[-4px]'}`}>كل الأفلام</Link>
                <Link href="/movies?sort=stars" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-semibold transition-all ${isActive('/movies?sort=stars') ? 'text-alex-primary translate-x-[-4px]' : 'text-gray-400 hover:text-white hover:translate-x-[-4px]'}`}>الأعلى تقييماً</Link>
                <Link href="/movies?category=84" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-semibold transition-all ${isActive('/movies?category=84') ? 'text-alex-primary translate-x-[-4px]' : 'text-gray-400 hover:text-white hover:translate-x-[-4px]'}`}>أفلام أكشن</Link>
              </div>
            </div>

            {/* المسلسلات */}
            <div className="sidebar-submenu-container">
              <button 
                onClick={() => !isCollapsed && setSeriesOpen(!seriesOpen)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5 sidebar-link-btn cursor-pointer"
              >
                <div className="flex items-center gap-3.5 sidebar-item-content">
                  <i className="fa-solid fa-tv text-lg w-5 text-center"></i>
                  <span className="sidebar-label">المسلسلات</span>
                </div>
                <i className={`fa-solid fa-chevron-left text-xs transition-transform duration-300 sidebar-label ${seriesOpen ? '-rotate-90' : ''}`}></i>
              </button>
              
              {/* Series Submenu */}
              <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] mr-8 space-y-1 mt-1 sidebar-submenu origin-top ${seriesOpen && !isCollapsed ? 'max-h-40 opacity-100 translate-y-0 scale-y-100' : 'max-h-0 opacity-0 -translate-y-2 scale-y-95 pointer-events-none'}`}>
                <Link href="/series" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-semibold transition-all ${isActive('/series') ? 'text-alex-primary translate-x-[-4px]' : 'text-gray-400 hover:text-white hover:translate-x-[-4px]'}`}>كل المسلسلات</Link>
                <Link href="/series?sort=stars" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-semibold transition-all ${isActive('/series?sort=stars') ? 'text-alex-primary translate-x-[-4px]' : 'text-gray-400 hover:text-white hover:translate-x-[-4px]'}`}>الأعلى تقييماً</Link>
                <Link href="/series?category=62" onClick={closeSidebar} className={`block py-2 px-4 text-sm font-semibold transition-all ${isActive('/series?category=62') ? 'text-alex-primary translate-x-[-4px]' : 'text-gray-400 hover:text-white hover:translate-x-[-4px]'}`}>مسلسلات دراما</Link>
              </div>
            </div>

            {/* انمي */}
            <Link 
              href="/series?category=57" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold sidebar-link-btn ${
                isActive('/series?category=57') 
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
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
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold sidebar-link-btn ${
                isActive('/series?view=episodes') 
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
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
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold sidebar-link-btn ${
                isActive('/movies?category=23') 
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
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
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold sidebar-link-btn ${
                isActive('/movies?category=63') 
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
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
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold sidebar-link-btn ${
                isActive('/movies?category=57') 
                  ? 'ios-active' 
                  : 'ios-button text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-child text-lg w-5 text-center text-green-400"></i>
                <span className="sidebar-label">الأطفال والكرتون</span>
              </div>
            </Link>
          </div>
          <div className="flex-grow min-h-[20px]" /> {/* Bottom spacer */}
        </div>
      </aside>
    </>
  );
}
