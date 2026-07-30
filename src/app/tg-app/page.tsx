"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTelegramLaunchPayload } from "@/lib/telegramWebAppClient";

const TELEGRAM_BOT_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "https://t.me/outhcinax_bot?start=webapp";

export default function TgAppPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const authenticationInFlightRef = useRef(false);
  const authenticationControllerRef = useRef<AbortController | null>(null);
  const disposedRef = useRef(false);

  const authenticateCurrentTelegramAccount = useCallback(async () => {
    if (authenticationInFlightRef.current || disposedRef.current) return;

    const { initData } = getTelegramLaunchPayload();
    if (!initData) {
      setErrorMessage("افتح التطبيق من بوت أليكس سينما داخل تليجرام.");
      return;
    }

    authenticationInFlightRef.current = true;
    setErrorMessage(null);

    try {
      sessionStorage.setItem("isTgWebApp", "true");
      document.body.classList.add("is-telegram-webapp");
      document.documentElement.classList.add("is-telegram-webapp");

      const controller = new AbortController();
      authenticationControllerRef.current = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
      let response: Response;

      try {
        response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({ initData }),
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "تعذر تسجيل الدخول عبر تليجرام.");
      }

      if (!disposedRef.current) {
        window.location.replace("/home?tgWebApp=true");
      }
    } catch (error) {
      console.error("[TgApp Direct Auth Error]:", error);

      if (!disposedRef.current) {
        const timedOut = error instanceof DOMException && error.name === "AbortError";
        setErrorMessage(
          timedOut
            ? "استغرق الاتصال وقتًا طويلًا. حاول مجددًا."
            : "تعذر ربط حساب تليجرام الحالي. أعد فتح التطبيق من البوت.",
        );
      }
    } finally {
      authenticationControllerRef.current = null;
      authenticationInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    const tg = window.Telegram?.WebApp;

    try {
      tg?.ready();
      tg?.expand();
      if (tg?.isVersionAtLeast?.("6.1")) {
        tg.setHeaderColor?.("#07111f");
        tg.setBackgroundColor?.("#07111f");
      }
      if (tg?.isVersionAtLeast?.("7.10")) {
        tg.setBottomBarColor?.("#07111f");
      }
    } catch (error) {
      console.error("[TgApp Init Error]:", error);
    }

    const handleResume = () => {
      void authenticateCurrentTelegramAccount();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") handleResume();
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    tg?.onEvent?.("activated", handleResume);

    const initialSyncId = window.setTimeout(handleResume, 0);

    return () => {
      disposedRef.current = true;
      authenticationControllerRef.current?.abort();
      authenticationControllerRef.current = null;
      window.clearTimeout(initialSyncId);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      tg?.offEvent?.("activated", handleResume);
    };
  }, [authenticateCurrentTelegramAccount]);

  return (
    <main
      dir="rtl"
      className="flex min-h-[100svh] w-full items-center justify-center bg-[#07111f] p-4 pt-[max(1rem,env(safe-area-inset-top))] text-white"
    >
      <section className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/15 bg-[#102139]/95 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
        <h1 dir="ltr" className="font-en text-xl font-black tracking-[0.12em] text-white sm:text-2xl">
          ALEX <span className="text-[#f21b26]">CINEMA</span>
        </h1>

        {errorMessage ? (
          <>
            <i className="fa-solid fa-circle-exclamation text-3xl text-red-400" aria-hidden="true" />
            <p className="text-sm font-bold leading-7 text-red-100">{errorMessage}</p>
            <div className="grid w-full gap-3">
              <button
                type="button"
                onClick={() => void authenticateCurrentTelegramAccount()}
                className="w-full rounded-xl bg-[#e50914] px-4 py-3 text-sm font-black text-white transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-[0.98]"
              >
                إعادة المحاولة
              </button>
              <Link
                href={TELEGRAM_BOT_URL}
                className="w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm font-black text-slate-100 transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                فتح البوت
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="size-11 animate-spin rounded-full border-4 border-red-500/25 border-t-[#e50914] motion-reduce:animate-none" />
            <p className="text-sm font-bold text-slate-100">جاري فتح المنصة...</p>
          </>
        )}
      </section>
    </main>
  );
}
