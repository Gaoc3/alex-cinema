"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import {
  configureTelegramWebApp,
  getTelegramLaunchPayload,
  markTelegramWebAppContext,
} from "@/lib/telegramWebAppClient";

export default function TelegramAutoAuth() {
  const pathname = usePathname();
  const router = useRouter();
  const { refetchUser } = useUnifiedAuth();
  const initializedRef = useRef(false);
  const authenticatedRef = useRef(false);

  // 1. Initial Telegram configuration & auto-route to Telegram WebApp view
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = window.Telegram?.WebApp;
    if (tg && !initializedRef.current) {
      initializedRef.current = true;
      markTelegramWebAppContext();
      configureTelegramWebApp();
    }

    const { initData } = getTelegramLaunchPayload();
    if (initData && (pathname === "/" || pathname === "/home")) {
      router.replace("/tg-app");
    }
  }, [pathname, router]);

  // 2. Native Telegram BackButton management with proper listener cleanup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    const isSubPage = pathname && pathname !== "/home" && pathname !== "/" && pathname !== "/tg-app";

    if (isSubPage) {
      tg.BackButton.show();

      const handleBack = () => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/home");
        }
      };

      tg.BackButton.onClick(handleBack);

      return () => {
        try {
          tg.BackButton?.offClick(handleBack);
        } catch {}
      };
    } else {
      tg.BackButton.hide();
    }
  }, [pathname, router]);

  // 3. Silent background authentication on initial launch
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authenticatedRef.current) {
      const { initData, unsafeUser } = getTelegramLaunchPayload();
      if (initData) {
        authenticatedRef.current = true;
        fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ initData, telegramData: unsafeUser }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              void refetchUser();
            }
          })
          .catch((err) => {
            console.error("[Silent Telegram Auth Error]:", err);
          });
      }
    }
  }, [refetchUser]);

  return null;
}
