"use client";

import { useEffect } from "react";

export default function TgAppPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set persistent session flag for Telegram WebApp safe area styling
    try {
      sessionStorage.setItem("isTgWebApp", "true");
      document.body.classList.add("is-telegram-webapp");
      document.documentElement.classList.add("is-telegram-webapp");
    } catch (e) {}

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.("#050505");
        tg.setBackgroundColor?.("#050505");
      } catch (e) {}
    }

    let initData = tg?.initData || "";
    let unsafeUser = tg?.initDataUnsafe?.user || null;

    if (!initData) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      initData = hashParams.get("tgWebAppData") || "";
    }
    if (!initData) {
      const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ""));
      initData = searchParams.get("tgWebAppData") || "";
    }

    // Direct background sync with PostgreSQL & session creation
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
        console.log("[TgApp Direct Auth Success]:", data);
        window.location.replace("/home?tgWebApp=true");
      })
      .catch((err) => {
        console.error("[TgApp Direct Auth Error]:", err);
        window.location.replace("/home?tgWebApp=true");
      });
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4 dir-rtl">
      <div className="flex flex-col items-center gap-4 bg-[#131b2e] border-2 border-white/20 p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center max-w-sm w-full">
        <h2 className="text-2xl font-black text-white tracking-wide">
          ALEX <span className="text-[#e50914]">CINEMA</span>
        </h2>
        <div className="w-10 h-10 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin my-2"></div>
        <p className="text-sm font-bold text-gray-200">
          جاري فتح المنصة وحفظ معلومات الحساب...
        </p>
      </div>
    </div>
  );
}
