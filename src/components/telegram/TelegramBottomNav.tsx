'use client';

import React from 'react';

export type TelegramTab = 'home' | 'search' | 'movies' | 'series' | 'rooms' | 'profile';

interface TelegramBottomNavProps {
  activeTab: TelegramTab;
  onSelectTab: (tab: TelegramTab) => void;
}

export default function TelegramBottomNav({ activeTab, onSelectTab }: TelegramBottomNavProps) {
  const tabs: { id: TelegramTab; label: string; icon: string }[] = [
    { id: 'profile', label: 'حسابي', icon: 'fa-solid fa-user' },
    { id: 'rooms', label: 'الرومات', icon: 'fa-solid fa-users' },
    { id: 'series', label: 'مسلسلات', icon: 'fa-solid fa-tv' },
    { id: 'movies', label: 'أفلام', icon: 'fa-solid fa-film' },
    { id: 'search', label: 'بحث', icon: 'fa-solid fa-magnifying-glass' },
    { id: 'home', label: 'الرئيسية', icon: 'fa-solid fa-house' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[52] px-3.5 pb-3 sm:pb-5 pt-1.5 pointer-events-none safe-bottom" dir="rtl">
      <div
        className="max-w-2xl mx-auto rounded-2xl sm:rounded-3xl flex items-center justify-between px-2 sm:px-6 py-2 sm:py-2.5 pointer-events-auto border border-white/20 shadow-[0_16px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl bg-[#0d1322]/95 transition-all"
        style={{ WebkitBackdropFilter: 'blur(30px)' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center min-w-0 max-w-[56px] xs:max-w-[64px] sm:max-w-[76px] py-1 sm:py-1.5 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'text-alex-primary font-black scale-105'
                  : 'text-gray-400 hover:text-gray-200 font-bold'
              }`}
            >
              {isActive && (
                <span className="absolute -top-2 w-7 xs:w-8 sm:w-10 h-1 rounded-full bg-alex-primary shadow-[0_0_12px_#e50914] animate-fade-in"></span>
              )}
              <i className={`${tab.icon} text-lg xs:text-xl sm:text-2xl mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}></i>
              <span className="text-[10px] xs:text-[11px] sm:text-xs font-black leading-tight tracking-tight truncate max-w-full">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
