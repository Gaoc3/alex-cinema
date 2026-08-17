'use client';

import React, { useEffect } from 'react';

export default function SidebarToggle() {
  useEffect(() => {
    // Check initial sidebar state from localStorage on mount
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 1280;
      const savedState = localStorage.getItem('sidebar-collapsed');
      const defaultCollapsed = savedState === 'false' ? false : true;
      if (!isMobile) {
        if (defaultCollapsed) {
          document.body.classList.add('sidebar-collapsed');
          document.body.classList.remove('sidebar-expanded');
        } else {
          document.body.classList.remove('sidebar-collapsed');
          document.body.classList.add('sidebar-expanded');
        }
      }
    }
  }, []);

  const toggleSidebar = () => {
    if (typeof document !== 'undefined') {
      const isMobile = window.innerWidth < 1280;
      if (isMobile) {
        document.body.classList.toggle('sidebar-open');
        window.dispatchEvent(new Event('sidebar-state-change'));
      } else {
        const isCurrentlyExpanded = document.body.classList.contains('sidebar-expanded');
        if (isCurrentlyExpanded) {
          document.body.classList.add('sidebar-collapsed');
          document.body.classList.remove('sidebar-expanded');
          localStorage.setItem('sidebar-collapsed', 'true');
        } else {
          document.body.classList.remove('sidebar-collapsed');
          document.body.classList.add('sidebar-expanded');
          localStorage.setItem('sidebar-collapsed', 'false');
        }
        window.dispatchEvent(new Event('sidebar-state-change'));
      }
    }
  };

  return (
    <button 
      onClick={toggleSidebar}
      className="w-10 h-10 sm:w-12 sm:h-12 xl:w-11 xl:h-11 rounded-full ios-button flex items-center justify-center hover:text-alex-primary text-gray-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
      aria-label="Toggle Sidebar"
    >
      <i className="fa-solid fa-bars text-lg sm:text-xl"></i>
    </button>
  );
}
