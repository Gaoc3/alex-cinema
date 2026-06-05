'use client';

import React, { useEffect, useState } from 'react';

export default function SidebarToggle() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Check initial sidebar state from localStorage on mount
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebar-collapsed');
      if (savedState === 'true') {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
    }

    const checkState = () => {
      if (typeof document !== 'undefined') {
        setIsCollapsed(document.body.classList.contains('sidebar-collapsed'));
      }
    };

    checkState();

    window.addEventListener('sidebar-state-change', checkState);
    return () => {
      window.removeEventListener('sidebar-state-change', checkState);
    };
  }, []);

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
    <button 
      onClick={toggleSidebar}
      className="w-12 h-12 rounded-full glass-panel border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-alex-primary transition-all hover-scale shadow-lg"
      aria-label="Toggle Sidebar"
    >
      <i className="fa-solid fa-bars text-gray-300 text-lg"></i>
    </button>
  );
}
