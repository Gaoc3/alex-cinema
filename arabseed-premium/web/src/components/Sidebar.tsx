'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
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

  const isActive = (path: string) => pathname === path;

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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300 lg:hidden pointer-events-none opacity-0 sidebar-overlay"
      />
      
      <aside className="fixed top-0 right-0 h-screen w-72 z-40 bg-[#070a13] border-l border-white/5 flex flex-col sidebar shadow-2xl overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute top-10 right-0 w-32 h-32 bg-alex-primary/5 rounded-full blur-[60px] pointer-events-none"></div>

        {/* Sidebar Header (Cinemana Style) */}
        <div className="h-24 border-b border-white/5 flex items-center justify-between px-5 w-full shrink-0 relative z-20">
          {/* Logo and Brand Name (Hidden on Collapsed) */}
          <div className="flex items-center gap-4 sidebar-brand-name">
            <Link href="/" className="flex items-center gap-4 group" onClick={closeSidebar} dir="ltr">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#e50914] to-[#8a0006] flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.5)] group-hover:shadow-[0_0_20px_rgba(229,9,20,0.8)] transition-all duration-300">
                <i className="fa-solid fa-play text-white ml-1 text-base"></i>
              </div>
              <div className="flex flex-col leading-none font-sans">
                <span className="text-xl font-black font-en tracking-wider text-white">ALEX<span className="text-alex-primary">CINEMA</span></span>
                <span className="text-[10px] text-gray-500 font-bold tracking-[0.1em] mt-1 uppercase">Premium</span>
              </div>
            </Link>
          </div>
          
          {/* Hamburger toggle button (Hidden on Collapsed) */}
          <button 
            onClick={toggleSidebar}
            className="w-10 h-10 rounded-xl glass-panel border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-alex-primary transition-all hover-scale cursor-pointer sidebar-brand-name"
            aria-label="Collapse Sidebar"
          >
            <i className="fa-solid fa-bars text-gray-300 text-base"></i>
          </button>

          {/* Centered logo button (Shown ONLY on Collapsed) */}
          <div className="sidebar-collapsed-logo w-full flex justify-center items-center">
            <button 
              onClick={toggleSidebar}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e50914] to-[#8a0006] flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.6)] hover:shadow-[0_0_25px_rgba(229,9,20,0.9)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Expand Sidebar"
            >
              <i className="fa-solid fa-play text-white ml-0.5 text-base"></i>
            </button>
          </div>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-grow overflow-y-auto hide-scrollbar px-4 py-6 space-y-7">
          {/* Navigation Section */}
          <div className="space-y-1.5">
            {/* الصفحة الرئيسية */}
            <Link 
              href="/" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn ${
                isActive('/') 
                  ? 'bg-alex-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
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
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn ${
                isActive('/new-releases')
                  ? 'bg-alex-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                  ? 'bg-alex-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
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
              <div className={`overflow-hidden transition-all duration-300 mr-8 space-y-1 mt-1 sidebar-submenu ${moviesOpen && !isCollapsed ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <Link href="/movies" onClick={closeSidebar} className="block py-2 px-4 text-sm font-semibold text-gray-400 hover:text-white transition-all">كل الأفلام</Link>
                <Link href="/movies?sort=stars" onClick={closeSidebar} className="block py-2 px-4 text-sm font-semibold text-gray-400 hover:text-white transition-all">الأعلى تقييماً</Link>
                <Link href="/movies?category=84" onClick={closeSidebar} className="block py-2 px-4 text-sm font-semibold text-gray-400 hover:text-white transition-all">أفلام أكشن</Link>
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
              <div className={`overflow-hidden transition-all duration-300 mr-8 space-y-1 mt-1 sidebar-submenu ${seriesOpen && !isCollapsed ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <Link href="/series" onClick={closeSidebar} className="block py-2 px-4 text-sm font-semibold text-gray-400 hover:text-white transition-all">كل المسلسلات</Link>
                <Link href="/series?sort=stars" onClick={closeSidebar} className="block py-2 px-4 text-sm font-semibold text-gray-400 hover:text-white transition-all">الأعلى تقييماً</Link>
                <Link href="/series?category=62" onClick={closeSidebar} className="block py-2 px-4 text-sm font-semibold text-gray-400 hover:text-white transition-all">مسلسلات دراما</Link>
              </div>
            </div>

            {/* انمي */}
            <Link 
              href="/movies?category=57" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn ${
                isActive('/movies?category=57') 
                  ? 'bg-alex-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-fire-flame-curved text-lg w-5 text-center text-red-500"></i>
                <span className="sidebar-label">انمي</span>
              </div>
            </Link>

            {/* أحدث الحلقات */}
            <Link 
              href="/new-releases?type=episodes" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn ${
                isActive('/new-releases?type=episodes') 
                  ? 'bg-alex-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-clock text-lg w-5 text-center text-sky-400"></i>
                <span className="sidebar-label">أحدث الحلقات</span>
              </div>
            </Link>

            {/* المصارعة الحرة */}
            <Link 
              href="/movies?category=80" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn ${
                isActive('/movies?category=80') 
                  ? 'bg-alex-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-mask text-lg w-5 text-center text-red-400"></i>
                <span className="sidebar-label">المصارعة الحرة</span>
              </div>
            </Link>

            {/* الأطفال والكرتون */}
            <Link 
              href="/movies?category=72" 
              onClick={closeSidebar}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn ${
                isActive('/movies?category=72') 
                  ? 'bg-alex-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-child text-lg w-5 text-center text-green-400"></i>
                <span className="sidebar-label">الأطفال والكرتون</span>
              </div>
            </Link>

            {/* طلبات الأفلام */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-paper-plane text-lg w-5 text-center text-amber-400"></i>
                <span className="sidebar-label">طلبات الأفلام</span>
              </div>
            </Link>

            {/* Divider */}
            <div className="border-t border-white/5 my-4 mx-2" />

            {/* تابع المشاهدة */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-play text-lg w-5 text-center text-blue-500"></i>
                <span className="sidebar-label">تابع المشاهدة</span>
              </div>
            </Link>

            {/* المشاهدة لاحقاً */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-square-play text-lg w-5 text-center text-purple-400"></i>
                <span className="sidebar-label">المشاهدة لاحقاً</span>
              </div>
            </Link>

            {/* المفضلة */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-heart text-lg w-5 text-center text-red-500"></i>
                <span className="sidebar-label">المفضلة</span>
              </div>
            </Link>

            {/* الاشتراكات */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-eye text-lg w-5 text-center text-teal-400"></i>
                <span className="sidebar-label">الاشتراكات</span>
              </div>
            </Link>

            {/* سجل المشاهدة */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-clock-rotate-left text-lg w-5 text-center text-indigo-400"></i>
                <span className="sidebar-label">سجل المشاهدة</span>
              </div>
            </Link>

            {/* Divider */}
            <div className="border-t border-white/5 my-4 mx-2" />

            {/* الإعدادات */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-sliders text-lg w-5 text-center text-gray-400"></i>
                <span className="sidebar-label">الإعدادات</span>
              </div>
            </Link>

            {/* مركز المساعدة */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-circle-question text-lg w-5 text-center text-gray-400"></i>
                <span className="sidebar-label">مركز المساعدة</span>
              </div>
            </Link>

            {/* تطبيقات شبكتي */}
            <Link 
              href="#" 
              onClick={closeSidebar}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all hover-scale sidebar-link-btn text-gray-400 hover:text-white hover:bg-white/5"
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-share-nodes text-lg w-5 text-center text-gray-400"></i>
                <span className="sidebar-label">تطبيقات شبكتي</span>
              </div>
            </Link>

          </div>
        </div>
      </aside>
    </>
  );
}
