"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import { useFavorites } from "@/hooks/useFavorites";
import FavoritesList from "./FavoritesList";
import MyRoomsList from "./profile/MyRoomsList";
import toast from "react-hot-toast";
import UserAvatar from "./UserAvatar";
import {
  isTelegramWebAppContext,
  TELEGRAM_CONTEXT_EVENT,
} from "@/lib/telegramWebAppClient";

const HeartIcon = () => <i className="fa-solid fa-heart text-red-500"></i>;
const FireIcon = () => <i className="fa-solid fa-fire text-red-500"></i>;
const UsersIcon = () => <i className="fa-solid fa-users text-sky-400"></i>;
const LogOutIcon = () => <i className="fa-solid fa-right-from-bracket text-red-500"></i>;

function subscribeToTelegramContext(onStoreChange: () => void) {
  window.addEventListener("pageshow", onStoreChange);
  window.addEventListener("focus", onStoreChange);
  window.addEventListener(TELEGRAM_CONTEXT_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("pageshow", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
    window.removeEventListener(TELEGRAM_CONTEXT_EVENT, onStoreChange);
  };
}

interface UserNavProps {
  onOpenFavorites?: () => void;
  onOpenRooms?: () => void;
  size?: 'small' | 'normal';
}

export default function UserNav({ onOpenFavorites, onOpenRooms, size = 'normal' }: UserNavProps = {}) {
  const { user, isLoaded, isTelegramUser, signOut } = useUnifiedAuth();
  const { favorites } = useFavorites();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isTelegramWebApp = useSyncExternalStore(
    subscribeToTelegramContext,
    isTelegramWebAppContext,
    () => true,
  );
  const [activeModal, setActiveModal] = useState<"favorites" | "my-rooms" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close modal or dropdown
  useEffect(() => {
    if (!activeModal && !dropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveModal(null);
        setDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal, dropdownOpen]);

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Body scroll locking when modal is open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModal]);

  if (!isLoaded || !user) return null;

  const isSmall = size === 'small';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        aria-label="قائمة حساب المستخدم"
        className={`${
          isSmall ? 'size-10 sm:size-11' : 'size-12 sm:size-14'
        } border-2 border-white/25 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.8)] hover:scale-105 hover:border-red-500 hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] transition-all duration-300 cursor-pointer overflow-hidden flex items-center justify-center bg-[#0b0f19] active:scale-95`}
        title={user.name}
      >
        <UserAvatar imageUrl={user.imageUrl} name={user.name} className="size-full text-base sm:text-lg" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-2 sm:mt-3 w-64 bg-[#06070a]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-white p-3.5 z-[100] animate-in fade-in zoom-in-95 duration-200" dir="rtl">
          <div className="flex items-center gap-3 p-2 pb-3 border-b border-white/10 mb-2">
            <UserAvatar imageUrl={user.imageUrl} name={user.name} className="size-10 border border-white/20 text-xs" />
            <div className="flex flex-col min-w-0 text-right">
              <span className="font-bold text-sm text-white truncate">{user.name}</span>
              <span className="text-xs text-sky-400 font-medium flex items-center gap-1">
                <i className={isTelegramUser ? "fa-brands fa-telegram" : "fa-solid fa-user-shield"}></i>
                {isTelegramUser ? "Telegram Account" : "AleX Cinema Account"}
              </span>
            </div>
          </div>

          <div className="space-y-1 font-cairo text-right">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                if (onOpenRooms) {
                  onOpenRooms();
                } else {
                  window.location.href = '/rooms';
                }
              }}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-white cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FireIcon />
                <span>الرومات النشطة</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                if (onOpenFavorites) {
                  onOpenFavorites();
                } else {
                  setActiveModal("favorites");
                }
              }}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-white cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <HeartIcon />
                <span>المفضلة</span>
              </div>
              {favorites.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600/20 text-red-400 border border-red-500/30">
                  {favorites.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                if (onOpenRooms) {
                  onOpenRooms();
                } else {
                  setActiveModal("my-rooms");
                }
              }}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-white cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UsersIcon />
                <span>غرف المشاهدة الخاصة بي</span>
              </div>
            </button>

            <div className="my-1.5 h-px bg-white/10" />

            <button
              type="button"
              disabled={isSigningOut}
              onClick={async () => {
                if (isSigningOut) return;
                setIsSigningOut(true);
                try {
                  await signOut();
                } catch (error) {
                  setIsSigningOut(false);
                  toast.error(error instanceof Error ? error.message : "تعذر تسجيل الخروج.");
                }
              }}
              className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOutIcon />
              <span>{isSigningOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulletproof Portaled Modal for Favorites / My Rooms */}
      {activeModal && mounted && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6" 
          dir="rtl"
        >
          {/* Backdrop */}
          <div 
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-fade-in"
          />

          {/* Modal Container */}
          <div 
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/15 bg-[#060a14]/95 text-white shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_50px_rgba(229,9,20,0.25)] backdrop-blur-2xl animate-scaleIn flex flex-col"
          >
            {/* Ambient Top Glow */}
            <div className="absolute -top-24 -right-24 size-60 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-7 py-4 sm:py-5 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-red-600/25 to-red-950/40 border border-red-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.3)]">
                  {activeModal === "favorites" ? <i className="fa-solid fa-heart text-red-500 text-lg"></i> : <UsersIcon />}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {activeModal === "favorites" ? "المفضلة السينمائية" : "غرف المشاهدة الخاصة بي"}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {activeModal === "favorites" ? "الأعمال المحفوظة في مكتبتك الخاصة" : "سجل وإدارة غرف المشاهدة"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                {activeModal === "favorites" && (
                  <Link
                    href="/favorites"
                    onClick={() => setActiveModal(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-xs font-bold transition-all"
                  >
                    <span>عرض الكل</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق النافذة"
                  className="size-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7 relative z-10">
              {activeModal === "favorites" && <FavoritesList onItemClick={() => setActiveModal(null)} />}
              {activeModal === "my-rooms" && <MyRoomsList />}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
