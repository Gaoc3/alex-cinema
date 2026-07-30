"use client";

import React, { useState, useRef, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import FavoritesList from "./FavoritesList";
import MyRoomsList from "./profile/MyRoomsList";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

const HeartIcon = () => <i className="fa-solid fa-heart text-pink-500"></i>;
const FireIcon = () => <i className="fa-solid fa-fire text-purple-400"></i>;
const UsersIcon = () => <i className="fa-solid fa-users text-blue-400"></i>;
const LogOutIcon = () => <i className="fa-solid fa-right-from-bracket text-red-500"></i>;

export default function UserNav() {
  const { user, isLoaded, isTelegramUser, signOut } = useUnifiedAuth();
  const { isSignedIn: isClerkSignedIn } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeModal, setActiveModal] = useState<"favorites" | "my-rooms" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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

  // If logged in via Clerk (and not a pure Telegram cookie session), use Clerk's UserButton
  if (isClerkSignedIn && !isTelegramUser) {
    return (
      <div className="relative">
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "!w-11 !h-11 sm:!w-13 sm:!h-13 border-2 border-white/25 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.8)] hover:scale-105 hover:border-red-500 hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] transition-all duration-300 cursor-pointer overflow-hidden",
              userButtonTrigger: "!w-11 !h-11 sm:!w-13 sm:!h-13 rounded-full flex items-center justify-center focus:shadow-none focus:outline-none",
              userButtonAvatarImage: "!w-full !h-full rounded-full object-cover",
              userButtonPopoverCard: "bg-[#0b0f19] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] !text-white",
              userButtonPopoverMain: "bg-[#0b0f19] !text-white",
              userButtonPopoverUserPreview: "bg-transparent !text-white p-3",
              userButtonPopoverUserPreviewMainIdentifier: "!text-white font-bold text-base drop-shadow-sm",
              userButtonPopoverUserPreviewSecondaryIdentifier: "!text-gray-300 text-xs font-medium",
              userButtonPopoverActionButton: "hover:bg-white/10 transition-all !text-white p-2.5 rounded-xl",
              userButtonPopoverActionButtonText: "font-bold font-cairo !text-white text-sm",
              userButtonPopoverActionButtonIcon: "!text-red-500 text-base",
              userButtonPopoverFooter: "!hidden pointer-events-none display-none",
              userButtonPopoverFooterPages: "!hidden",
              userPreviewTextContainer: "!text-white",
              userButtonPopoverCustomItemButton: "hover:bg-white/10 transition-all !text-white font-bold text-sm",
            },
            variables: {
              colorPrimary: '#e50914',
              colorPrimaryForeground: '#ffffff',
              colorBackground: '#0b0f19',
              colorForeground: '#ffffff',
              colorMutedForeground: '#e5e7eb',
              colorInput: '#111827',
              colorInputForeground: '#ffffff',
              fontFamily: 'var(--font-cairo)',
              borderRadius: '1rem',
            }
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link label="الرومات النشطة" labelIcon={<FireIcon />} href="/rooms" />
          </UserButton.MenuItems>

          <UserButton.UserProfilePage label="المفضلة" labelIcon={<HeartIcon />} url="favorites">
            <div className="w-full h-full p-4 overflow-y-auto">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <HeartIcon /> المفضلة
              </h2>
              <FavoritesList />
            </div>
          </UserButton.UserProfilePage>

          <UserButton.UserProfilePage label="غرفي" labelIcon={<UsersIcon />} url="my-rooms">
            <div className="w-full h-full p-4 overflow-y-auto">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <UsersIcon /> غرف المشاهدة الخاصة بي
              </h2>
              <MyRoomsList />
            </div>
          </UserButton.UserProfilePage>
        </UserButton>
      </div>
    );
  }

  // Telegram User Avatar & Custom Profile Dropdown Menu
  let isTelegramWebApp = false;
  if (typeof window !== 'undefined') {
    // Only a live, signed Telegram launch may hide sign-out. A stored flag can
    // outlive the WebView and must not affect the regular website.
    isTelegramWebApp = Boolean(window.Telegram?.WebApp?.initData);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-11 h-11 sm:w-13 sm:h-13 border-2 border-white/25 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.8)] hover:scale-105 hover:border-red-500 hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] transition-all duration-300 cursor-pointer overflow-hidden flex items-center justify-center bg-[#0b0f19]"
        title={user.name}
      >
        <Image
          src={user.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
          alt={user.name}
          width={52}
          height={52}
          sizes="(max-width: 639px) 44px, 52px"
          unoptimized
          className="w-full h-full object-cover rounded-full"
        />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-3 w-64 bg-[#06070a]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-white p-3.5 z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 p-2 pb-3 border-b border-white/10 mb-2">
            <Image
              src={user.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
              alt={user.name}
              width={40}
              height={40}
              sizes="40px"
              unoptimized
              className="w-10 h-10 rounded-full object-cover border border-white/20"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-white truncate">{user.name}</span>
              <span className="text-xs text-sky-400 font-medium flex items-center gap-1">
                <i className="fa-brands fa-telegram"></i> Telegram Account
              </span>
            </div>
          </div>

          <div className="space-y-1 font-cairo">
            <Link
              href="/rooms"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-white"
            >
              <FireIcon />
              <span>الرومات النشطة</span>
            </Link>

            <button
              onClick={() => {
                setDropdownOpen(false);
                setActiveModal("favorites");
              }}
              className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-white"
            >
              <HeartIcon />
              <span>المفضلة</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                setActiveModal("my-rooms");
              }}
              className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-white"
            >
              <UsersIcon />
              <span>غرف المشاهدة الخاصة بي</span>
            </button>

            {!isTelegramWebApp && (
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
                className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all mt-2 border-t border-white/10 pt-2.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOutIcon />
                <span>{isSigningOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal for Favorites / My Rooms */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[85vh] p-6 relative overflow-hidden flex flex-col shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            {activeModal === "favorites" && (
              <div className="w-full h-full overflow-y-auto">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                  <HeartIcon /> المفضلة
                </h2>
                <FavoritesList />
              </div>
            )}

            {activeModal === "my-rooms" && (
              <div className="w-full h-full overflow-y-auto">
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
