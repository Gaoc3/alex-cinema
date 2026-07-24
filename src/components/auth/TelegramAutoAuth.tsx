"use client";

import { useEffect } from "react";

export default function TelegramAutoAuth() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = (window as any).Telegram?.WebApp;
    const isTgApp = Boolean(tg && (tg.initData || tg.initDataUnsafe?.user));

    if (isTgApp || (typeof window !== "undefined" && window.location.search.includes("tgWebApp"))) {
      document.body.classList.add("is-telegram-webapp");
      document.documentElement.classList.add("is-telegram-webapp");
    }

    if (tg) {
      try {
        tg.ready();
        tg.expand();

        if (typeof tg.setHeaderColor === "function") {
          tg.setHeaderColor("#050505");
        }
        if (typeof tg.setBackgroundColor === "function") {
          tg.setBackgroundColor("#050505");
        }
        if (typeof tg.requestFullscreen === "function") {
          tg.requestFullscreen();
        }
        if (typeof tg.disableVerticalSwipes === "function") {
          tg.disableVerticalSwipes();
        }
        tg.isVerticalSwipesEnabled = false;

        if (typeof tg.enableClosingConfirmation === "function") {
          tg.enableClosingConfirmation();
        }
      } catch (e) {
        console.error("[Telegram WebApp Init Error]:", e);
      }
    }

    // Block external OAuth / sign-in links inside Telegram WebApp to prevent "Failed to load Outh" error
    const handleGlobalClick = (e: MouseEvent) => {
      if (!isTgApp) return;
      const target = (e.target as HTMLElement)?.closest("a");
      if (target) {
        const href = target.getAttribute("href") || "";
        if (href.includes("/sign-in") || href.includes("/sign-up") || href.includes("clerk.") || href.includes("accounts.")) {
          e.preventDefault();
          e.stopPropagation();
          console.log("[Telegram WebApp] Blocked OAuth navigation inside webview to prevent 'Failed to load Outh' error.");
        }
      }
    };

    window.addEventListener("click", handleGlobalClick, true);

    let initData = tg?.initData || "";
    let unsafeUser = tg?.initDataUnsafe?.user || null;

    if (!initData) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      initData = hashParams.get("tgWebAppData") || "";
    }

    if (!initData && !unsafeUser) {
      return () => {
        window.removeEventListener("click", handleGlobalClick, true);
      };
    }

    const currentTgUserId = unsafeUser?.id ? String(unsafeUser.id) : null;

    // Check currently logged in session first to detect Telegram account switching in real-time
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((meData) => {
        const loggedInTgId = meData?.user?.telegramId ? String(meData.user.telegramId) : null;

        // If not logged in OR logged in under a different Telegram account (user switched TG account)
        if (!meData?.success || (currentTgUserId && loggedInTgId !== currentTgUserId)) {
          console.log("[Telegram Auth Account Switch/Login Triggered]", { currentTgUserId, loggedInTgId });

          fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData: initData || "",
              telegramData: unsafeUser || null,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data?.success) {
                console.log("[Telegram Silent Auth Success]:", data.user?.name);
                // If user switched accounts, reload to update UI in real-time
                if (loggedInTgId && loggedInTgId !== currentTgUserId) {
                  window.location.reload();
                }
              }
            })
            .catch((e) => console.error("[Telegram Silent Auth Error]:", e));
        }
      })
      .catch((e) => console.error("[Auth Me Check Error]:", e));

    return () => {
      window.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  return null;
}
