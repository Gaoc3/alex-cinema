'use client';

import React, { useEffect } from 'react';

export default function SidebarToggle() {
  useEffect(() => {
    // Check initial sidebar state from localStorage on mount
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebar-collapsed');
      if (savedState === 'false') {
        document.body.classList.remove('sidebar-collapsed');
      } else {
        document.body.classList.add('sidebar-collapsed');
      }
    }
  }, []);

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
        } else {
          document.body.classList.remove('sidebar-collapsed');
          localStorage.setItem('sidebar-collapsed', 'false');
        }
        window.dispatchEvent(new Event('sidebar-state-change'));
      }
    }
  };

  return (
    <button 
      onClick={toggleSidebar}
      className="w-10 h-10 sm:w-12 sm:h-12 xl:w-11 xl:h-11 rounded-full ios-button flex items-center justify-center hover:text-alex-primary"
      aria-label="Toggle Sidebar"
    >
      <i className="fa-solid fa-bars text-gray-300 text-sm sm:text-base"></i>
    </button>
  );
}
