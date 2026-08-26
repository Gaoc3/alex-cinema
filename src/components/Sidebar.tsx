'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useUnifiedAuth } from './auth/UnifiedAuthProvider';
import { toast } from 'react-hot-toast';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [moviesOpen, setMoviesOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUnifiedAuth();

  // Force re-render on query parameter changes to keep link highlights updated
  const searchParamsString = searchParams ? searchParams.toString() : '';

  // Automatically close mobile drawer when route changes
  useEffect(() => {
    closeSidebar();
  }, [pathname, searchParamsString]);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    void e;
    void href;
  };

  // Auto-expand submenus based on pathname context (Zero-Legacy Context-Awareness)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const hasCategory = searchParams ? searchParams.get('category') : null;
      const hasView = searchParams ? searchParams.get('view') : null;
      if (pathname.startsWith('/movies') && !hasCategory) {
        setMoviesOpen(true);
      }
      if (pathname.startsWith('/series') && !hasCategory && !hasView) {
        setSeriesOpen(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchParams, searchParamsString]);

  // Local short screen check (Can optionally use global var, but keeping it here for reactivity on padding)
  const [layout, setLayout] = useState({ isShortScreen: false });

  useEffect(() => {
    const checkState = () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 1280;
        const savedState = localStorage.getItem('sidebar-collapsed');
        const defaultCollapsed = savedState === 'false' ? false : true;
        if (!isMobile) {
          if (defaultCollapsed) {
            document.body.classList.add('sidebar-collapsed');
            document.body.classList.remove('sidebar-expanded');
            setIsCollapsed(true);
          } else {
            document.body.classList.remove('sidebar-collapsed');
            document.body.classList.add('sidebar-expanded');
            setIsCollapsed(false);
          }
        }
        setIsMobileSidebarOpen(document.body.classList.contains('sidebar-open'));
        setLayout({
          isShortScreen: window.innerHeight < 750
        });
      }
    };

    const initialFrame = window.requestAnimationFrame(checkState);

    window.addEventListener('sidebar-state-change', checkState, { passive: true });
    window.addEventListener('resize', checkState, { passive: true });
    window.addEventListener('orientationchange', checkState, { passive: true });

    return () => {
      window.removeEventListener('sidebar-state-change', checkState);
      window.removeEventListener('resize', checkState);
      window.removeEventListener('orientationchange', checkState);
      window.cancelAnimationFrame(initialFrame);
    };
  }, []);

  const paddingClass = layout.isShortScreen ? 'py-2.5' : 'py-3.5';

  const isActive = (path: string) => {
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
    
    // Custom logic for "/movies" (كل الأفلام)
    if (path === '/movies') {
      if (pathname !== '/movies') return false;
      const sort = searchParams.get('sort');
      const category = searchParams.get('category');
      if (sort === 'popular' || sort === 'stars') return false;
      if (category && category !== '') return false;
      return true;
    }

    // Custom logic for "/series" (كل المسلسلات)
    if (path === '/series') {
      if (pathname !== '/series') return false;
      const sort = searchParams.get('sort');
      const category = searchParams.get('category');
      const view = searchParams.get('view');
      if (sort === 'stars') return false;
      if (category && category !== '') return false;
      if (view && view !== '') return false;
      return true;
    }
    
    // For other paths without query strings, only match if pathname matches and there are no search params
    const keys = Array.from(searchParams.keys()).filter(k => k !== 'page');
    return pathname === path && keys.length === 0;
  };

  const closeSidebar = () => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('sidebar-open');
      setIsMobileSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (typeof document !== 'undefined') {
      const isMobile = window.innerWidth < 1280;
      if (isMobile) {
        document.body.classList.toggle('sidebar-open');
        setIsMobileSidebarOpen(document.body.classList.contains('sidebar-open'));
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
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300 xl:hidden ${isMobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} sidebar-overlay`}
        style={{ touchAction: 'none' }}
      />
      
      <aside 
        className={`fixed top-0 right-0 z-[60] flex flex-col bg-[#061520] sidebar overflow-hidden border-r-0 border-y-0 border-l border-white/[0.08] shadow-[-10px_0_30px_rgba(0,0,0,0.65),-3px_0_10px_rgba(0,0,0,0.4)] h-screen ${
          isMobileSidebarOpen ? 'w-72 max-w-[85vw]' : (isCollapsed ? 'w-20 xl:w-20' : 'w-72 xl:w-72')
        }`} 
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
              onClick={(e) => handleNav(e, '/home')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
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

            {/* رومات المشاهدة */}
            <button 
              onClick={async (e) => {
                e.preventDefault();
                closeSidebar();
                try {
                  if (!isSignedIn && !user) {
                    toast.error('يجب تسجيل الدخول لإنشاء روم');
                    return;
                  }
                  
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
                    body: JSON.stringify({ title: 'روم مشاهدة جماعية' })
                  });
                  
                  const res = await response.json();
                  if (res.success && res.roomId) {
                    toast.success('تم إنشاء الروم بنجاح!');
                    router.push(`/room/${res.roomId}?create=true`);
                  } else {
                    toast.error(res.error || 'يجب تسجيل الدخول لإنشاء روم');
                  }
                } catch (err) {
                  console.error(err);
                  toast.error('حدث خطأ أثناء إنشاء الروم');
                }
              }}
              className={`flex w-full items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
                pathname.startsWith('/room/')
                  ? 'bg-purple-600/20 text-white border-r-[3px] border-purple-500 font-black shadow-[0_4px_15px_rgba(147,51,234,0.15)]' 
                  : 'bg-transparent text-purple-400 hover:text-white hover:bg-purple-500/10 border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-users text-lg w-5 text-center drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"></i>
                <span className="sidebar-label">إنشاء روم مشاهدة</span>
              </div>
            </button>

            {/* الرومات النشطة */}
            <Link 
              href="/rooms" 
              onClick={(e) => handleNav(e, '/rooms')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
                isActive('/rooms') 
                  ? 'bg-purple-600/20 text-white border-r-[3px] border-purple-500 font-black shadow-[0_4px_15px_rgba(147,51,234,0.15)]' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}
            >
              <div className="flex items-center gap-3.5 sidebar-item-content w-full">
                <i className="fa-solid fa-fire text-lg w-5 text-center text-purple-400"></i>
                <span className="sidebar-label">الرومات النشطة</span>
              </div>
            </Link>

            {/* الإصدارات الجديدة */}
            <Link 
              href="/new-releases" 
              onClick={(e) => handleNav(e, '/new-releases')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
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
              href="/movies?sort=popular" 
              onClick={(e) => handleNav(e, '/movies?sort=popular')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
                pathname === '/movies' && isActive('/movies?sort=popular')
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
              <div className={`w-full flex items-center justify-between px-2 rounded-xl transition-all duration-300 ease-in-out active:scale-[0.97] ${
                pathname.startsWith('/movies') && !searchParams.get('sort') && !searchParams.get('category')
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}>
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
                  className="flex items-center gap-3.5 sidebar-item-content flex-grow py-2 px-2 cursor-pointer text-left w-full"
                >
                  <i className="fa-solid fa-film text-lg w-5 text-center"></i>
                  <span className="sidebar-label text-[15px]">الأفلام</span>
                </button>
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
                <Link href="/movies" onClick={(e) => handleNav(e, '/movies')} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/movies') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>كل الأفلام</Link>
                <Link href="/movies?sort=stars" onClick={(e) => handleNav(e, '/movies?sort=stars')} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/movies?sort=stars') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>الأعلى تقييماً</Link>
                <Link href="/movies?category=84" onClick={(e) => handleNav(e, '/movies?category=84')} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/movies?category=84') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>أفلام أكشن</Link>
              </div>
            </div>

            {/* المسلسلات */}
            <div className="sidebar-submenu-container flex flex-col">
              <div className={`w-full flex items-center justify-between px-2 rounded-xl transition-all duration-300 ease-in-out active:scale-[0.97] ${
                pathname.startsWith('/series') && !searchParams.get('sort') && !searchParams.get('category') && !searchParams.get('view')
                  ? 'bg-white/[0.08] text-white border-r-[3px] border-alex-primary font-black shadow-[0_4px_15px_rgba(0,0,0,0.15)]'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04] border-r-[3px] border-transparent font-medium'
              }`}>
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
                  className="flex items-center gap-3.5 sidebar-item-content flex-grow py-2 px-2 cursor-pointer text-left w-full"
                >
                  <i className="fa-solid fa-tv text-lg w-5 text-center"></i>
                  <span className="sidebar-label text-[15px]">المسلسلات</span>
                </button>
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
                <Link href="/series" onClick={(e) => handleNav(e, '/series')} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/series') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>كل المسلسلات</Link>
                <Link href="/series?sort=stars" onClick={(e) => handleNav(e, '/series?sort=stars')} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/series?sort=stars') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>الأعلى تقييماً</Link>
                <Link href="/series?category=62" onClick={(e) => handleNav(e, '/series?category=62')} className={`block py-2 px-4 text-sm font-medium transition-all ${isActive('/series?category=62') ? 'text-alex-primary font-bold translate-x-[-4px]' : 'text-gray-500 hover:text-gray-200 hover:translate-x-[-4px]'}`}>مسلسلات دراما</Link>
              </div>
            </div>

            {/* انمي */}
            <Link 
              href="/series?category=57" 
              onClick={(e) => handleNav(e, '/series?category=57')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
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
              onClick={(e) => handleNav(e, '/series?view=episodes')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
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
              onClick={(e) => handleNav(e, '/movies?category=23')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
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
              onClick={(e) => handleNav(e, '/movies?category=63')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
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
              onClick={(e) => handleNav(e, '/movies?category=57')}
              className={`flex items-center justify-between px-4 ${paddingClass} rounded-xl text-[15px] transition-all duration-300 ease-in-out active:scale-[0.97] sidebar-link-btn ${
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
