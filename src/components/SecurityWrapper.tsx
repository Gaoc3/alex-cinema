'use client';

import React, { useEffect } from 'react';

export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Prevent Right-Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    // 2. Prevent Keyboard Shortcuts for DevTools
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Ctrl+Shift+I (Inspect)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // 3. Disable Console Logging
    const noop = () => {};
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    if (process.env.NODE_ENV === 'production') {
      console.log = noop;
      console.info = noop;
      console.warn = noop;
      console.error = noop;
    }

    // 4. Advanced DevTools Detection & Debugger Trap
    const detectDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      
      if (widthDiff || heightDiff) {
        // Obfuscate the page if DevTools are opened
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;font-size:24px;font-weight:bold;">غير مصرح لك باستعراض الأكواد 🚫</div>';
      }
    };

    const debuggerTrap = setInterval(() => {
      detectDevTools();
      if (process.env.NODE_ENV === 'production') {
        console.clear();
      }
      const start = new Date().getTime();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = new Date().getTime();
      // If debugger paused execution
      if (end - start > 100) {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;font-size:24px;font-weight:bold;">تم رصد محاولة تتبع 🚫</div>';
      }
    }, 1500);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(debuggerTrap);
      
      if (process.env.NODE_ENV === 'production') {
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
        console.error = originalError;
      }
    };
  }, []);

  return <>{children}</>;
}

