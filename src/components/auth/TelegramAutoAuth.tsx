"use client";

import { useEffect, useRef } from "react";

export default function TelegramAutoAuth() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current || typeof window === "undefined") return;

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {}
    }

    let initData = tg?.initData || "";
    let unsafeUser = tg?.initDataUnsafe?.user || null;

    if (!initData) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      initData = hashParams.get("tgWebAppData") || "";
    }

    if (initData || unsafeUser) {
      attemptedRef.current = true;
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
          }
        })
        .catch((e) => {
          console.error("[Telegram Silent Auth Error]:", e);
        });
    }
  }, []);

  return null;
}
