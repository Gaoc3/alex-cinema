'use client';

import React, { useEffect, useState } from 'react';
import TelegramAppShell from '@/components/telegram/TelegramAppShell';
import {
  configureTelegramWebApp,
  getTelegramLaunchPayload,
  markTelegramWebAppContext,
} from '@/lib/telegramWebAppClient';

export default function TgAppPage() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    markTelegramWebAppContext();
    configureTelegramWebApp();

    // Auto-authenticate Telegram session in background
    const { initData } = getTelegramLaunchPayload();
    if (initData) {
      fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ initData }),
      }).catch((err) => console.warn('[Telegram Auto Auth Background]:', err));
    }

    setInitialized(true);
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-xs font-bold">ALEX CINEMA</p>
      </div>
    );
  }

  return <TelegramAppShell />;
}
