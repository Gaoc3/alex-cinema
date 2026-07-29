"use client";

import { useEffect } from "react";

export default function TelegramAutoAuth() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = (window as any).Telegram?.WebApp;
    const isStoredTg = typeof window !== "undefined" && (
      sessionStorage.getItem("isTgWebApp") === "true" ||
      window.location.search.includes("tgWebApp") ||
      Boolean(tg)
    );
    const isTgApp = Boolean(tg && (tg.initData || tg.initDataUnsafe?.user)) || isStoredTg;

    if (isStoredTg) {
      document.body.classList.add("is-telegram-webapp");
      document.documentElement.classList.add("is-telegram-webapp");
      try {
        sessionStorage.setItem("isTgWebApp", "true");
      } catch (e) {}
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

    let initData = tg?.initData || "";
    let unsafeUser = tg?.initDataUnsafe?.user || null;

    if (!initData) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      initData = hashParams.get("tgWebAppData") || "";
    }

    if (!initData && !unsafeUser) {
      return;
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
  }, []);

  return null;
}
