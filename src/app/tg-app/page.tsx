"use client";

import { useEffect, useState } from "react";

export default function TgAppPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let disposed = false;

    // Set persistent session flag for Telegram WebApp safe area styling
    try {
      sessionStorage.setItem("isTgWebApp", "true");
      document.body.classList.add("is-telegram-webapp");
      document.documentElement.classList.add("is-telegram-webapp");
    } catch {}

    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.isVersionAtLeast?.("6.1")) {
          tg.setHeaderColor?.("#050505");
          tg.setBackgroundColor?.("#050505");
        }
      } catch {}
    }

    let initData = tg?.initData || "";
    const unsafeUser = tg?.initDataUnsafe?.user || null;

    if (!initData) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      initData = hashParams.get("tgWebAppData") || "";
    }
    if (!initData) {
      const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ""));
      initData = searchParams.get("tgWebAppData") || "";
    }

    const authenticateCurrentTelegramAccount = async () => {
      try {
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            initData,
            telegramData: unsafeUser,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Telegram authentication failed.");
        }

        if (!disposed) {
          window.location.replace("/home?tgWebApp=true");
        }
      } catch (error) {
        console.error("[TgApp Direct Auth Error]:", error);

        // Never continue with the previous Telegram account after a failed switch.
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
          });
        } catch (logoutError) {
          console.error("[TgApp Stale Session Clear Error]:", logoutError);
        }

        if (!disposed) {
          setErrorMessage("تعذر التحقق من حساب تليجرام الحالي. يرجى إعادة فتح التطبيق من البوت.");
        }
      }
    };

    void authenticateCurrentTelegramAccount();

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4 dir-rtl">
      <div className="flex flex-col items-center gap-4 bg-[#131b2e] border-2 border-white/20 p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center max-w-sm w-full">
        <h2 className="text-2xl font-black text-white tracking-wide">
          ALEX <span className="text-[#e50914]">CINEMA</span>
        </h2>
        {errorMessage ? (
          <>
            <i className="fa-solid fa-triangle-exclamation text-3xl text-red-400"></i>
            <p className="text-sm font-bold text-red-200 leading-7">{errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-[#e50914] px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 active:scale-[0.98]"
            >
              إعادة المحاولة
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin my-2"></div>
            <p className="text-sm font-bold text-gray-200">
              جاري فتح المنصة وحفظ معلومات الحساب...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
