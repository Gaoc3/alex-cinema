"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import FavoritesList from "./FavoritesList";
import MyRoomsList from "./profile/MyRoomsList";
import toast from "react-hot-toast";
import UserAvatar from "./UserAvatar";
import {
  isTelegramWebAppContext,
  TELEGRAM_CONTEXT_EVENT,
} from "@/lib/telegramWebAppClient";

const HeartIcon = () => <i className="fa-solid fa-heart text-pink-500"></i>;
const FireIcon = () => <i className="fa-solid fa-fire text-purple-400"></i>;
const UsersIcon = () => <i className="fa-solid fa-users text-blue-400"></i>;
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isTelegramWebApp = useSyncExternalStore(
    subscribeToTelegramContext,
    isTelegramWebAppContext,
    () => true,
  );
  const [activeModal, setActiveModal] = useState<"favorites" | "my-rooms" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoaded || !user) return null;

  const isSmall = size === 'small';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`${
          isSmall ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-12 h-12 sm:w-14 sm:h-14'
        } border-2 border-white/25 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.8)] hover:scale-105 hover:border-red-500 hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] transition-all duration-300 cursor-pointer overflow-hidden flex items-center justify-center bg-[#0b0f19]`}
        title={user.name}
      >
        <UserAvatar imageUrl={user.imageUrl} name={user.name} className="size-full text-base sm:text-lg" />
      </button>


      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-2 sm:mt-3 w-64 bg-[#07090e]/95 backdrop-blur-3xl border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(229,9,20,0.1)] text-white p-3 z-[100] animate-in fade-in zoom-in-95 duration-200">
          {/* User Header Profile */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 mb-2">
            <UserAvatar imageUrl={user.imageUrl} name={user.name} className="size-10 border border-white/20 text-xs shadow-md" />
            <div className="flex flex-col min-w-0">
              <span className="font-black text-sm text-white truncate">{user.name}</span>
              <span className="text-[11px] text-sky-400 font-bold flex items-center gap-1 mt-0.5">
                <i className={isTelegramUser ? "fa-brands fa-telegram text-xs" : "fa-solid fa-user-shield text-xs"}></i>
                {isTelegramUser ? "حساب تليجرام" : "حساب أليكس سينما"}
              </span>
            </div>
          </div>

          <div className="space-y-1 font-cairo">
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
              className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/[0.08] transition-all text-gray-200 hover:text-white cursor-pointer group"
            >
              <span className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-fire text-xs"></i>
              </span>
              <span>الرومات النشطة</span>
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
              className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/[0.08] transition-all text-gray-200 hover:text-white cursor-pointer group"
            >
              <span className="w-6 h-6 rounded-lg bg-pink-500/15 border border-pink-500/25 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-heart text-xs"></i>
              </span>
              <span>المفضلة</span>
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
              className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-white/[0.08] transition-all text-gray-200 hover:text-white cursor-pointer group"
            >
              <span className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-users text-xs"></i>
              </span>
              <span>غرف المشاهدة الخاصة بي</span>
            </button>

            {/* Clean separator line */}
            <div className="my-2 h-px bg-white/10" />

            {/* Premium Logout Button */}
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
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-200 bg-red-500/[0.08] hover:bg-red-500/[0.18] border border-red-500/20 hover:border-red-500/40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 group shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-right-from-bracket text-xs"></i>
                </span>
                <span>{isSigningOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
              </div>
              <i className="fa-solid fa-arrow-left text-[10px] text-red-400/60 group-hover:text-red-300 group-hover:-translate-x-0.5 transition-all"></i>
            </button>
          </div>
        </div>
      )}

      {/* Modal for Favorites / My Rooms */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[85vh] p-6 relative overflow-hidden flex flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-20 cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            {activeModal === "favorites" && (
              <div className="w-full h-full overflow-y-auto pt-2">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                  <HeartIcon /> المفضلة
                </h2>
                <FavoritesList />
              </div>
            )}

            {activeModal === "my-rooms" && (
              <div className="w-full h-full overflow-y-auto pt-2">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                  <UsersIcon /> غرف المشاهدة الخاصة بي
                </h2>
                <MyRoomsList />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
