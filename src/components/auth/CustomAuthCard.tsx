"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

interface CustomAuthCardProps {
  mode?: "sign-in" | "sign-up";
}

interface TelegramAuthPayload {
  initData: string;
  telegramData: TelegramWebAppUser | null;
}

const clerkAppearance = {
  theme: "simple" as const,
  options: {
    logoPlacement: "none" as const,
    socialButtonsVariant: "blockButton" as const,
    socialButtonsPlacement: "top" as const,
    showOptionalFields: false,
  },
  variables: {
    colorPrimary: "#e50914",
    colorPrimaryForeground: "#ffffff",
    colorDanger: "#fb7185",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    colorNeutral: "#e2e8f0",
    colorForeground: "#f8fafc",
    colorMuted: "#111827",
    colorMutedForeground: "#94a3b8",
    colorBackground: "transparent",
    colorInput: "rgba(15, 23, 42, 0.82)",
    colorInputForeground: "#ffffff",
    colorRing: "rgba(229, 9, 20, 0.42)",
    colorBorder: "rgba(255, 255, 255, 0.16)",
    fontFamily: "Cairo, sans-serif",
    fontFamilyButtons: "Cairo, sans-serif",
    borderRadius: "1rem",
    spacing: "1rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    header: "mb-5 text-right",
    headerTitle: "text-xl font-black tracking-tight text-white sm:text-2xl",
    headerSubtitle: "mt-1.5 text-sm font-semibold leading-6 text-slate-400",
    socialButtonsRoot: "gap-3",
    socialButtonsBlockButton:
      "min-h-12 rounded-2xl border border-white/15 bg-white/[0.06] text-white shadow-none transition hover:border-white/30 hover:bg-white/[0.1]",
    socialButtonsBlockButtonText: "font-extrabold text-white",
    socialButtonsProviderIcon: "size-5",
    dividerRow: "my-5",
    dividerLine: "bg-white/10",
    dividerText: "px-3 text-xs font-bold text-slate-500",
    form: "gap-4",
    formFieldRow: "gap-2",
    formFieldLabel: "mb-1.5 text-sm font-extrabold text-slate-200",
    formFieldInput:
      "min-h-12 rounded-2xl border border-white/15 bg-slate-950/70 px-4 text-right text-white shadow-inner outline-none transition placeholder:text-slate-500 focus:border-red-500/70 focus:ring-4 focus:ring-red-500/15",
    formFieldInputShowPasswordButton: "text-slate-400 hover:text-white",
    formFieldAction: "font-bold text-red-400 hover:text-red-300",
    formFieldErrorText: "mt-1 text-xs font-bold text-red-300",
    formButtonPrimary:
      "min-h-12 rounded-2xl border border-red-400/25 bg-gradient-to-l from-red-700 via-[#e50914] to-red-600 text-sm font-black text-white shadow-[0_12px_30px_rgba(229,9,20,0.3)] transition hover:brightness-110 hover:shadow-[0_16px_38px_rgba(229,9,20,0.42)] active:scale-[0.99]",
    formResendCodeLink: "font-extrabold text-red-400 hover:text-red-300",
    otpCodeFieldInput:
      "border-white/15 bg-slate-950/80 text-white focus:border-red-500 focus:ring-red-500/20",
    identityPreview: "rounded-2xl border border-white/10 bg-white/[0.05]",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-red-400 hover:text-red-300",
    alternativeMethodsBlockButton:
      "rounded-2xl border border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.09]",
    footer: "mt-5 bg-transparent",
    footerAction: "justify-center gap-2",
    footerActionText: "font-semibold text-slate-400",
    footerActionLink: "font-black text-red-400 hover:text-red-300",
    footerPages: "hidden",
  },
  captcha: { theme: "dark" as const },
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function CustomAuthCard({ mode = "sign-in" }: CustomAuthCardProps) {
  const [loading, setLoading] = useState(true);
  const [isOutsideTelegram, setIsOutsideTelegram] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const authProcessedRef = useRef(false);
  const browserPreparationRef = useRef<Promise<void> | null>(null);

  const processTelegramAuth = useCallback(async (payload: TelegramAuthPayload) => {
    if (authProcessedRef.current) return;
    authProcessedRef.current = true;
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "فشل تسجيل الدخول عبر تليجرام.");
      }

      window.location.replace("/home?tgWebApp=true");
    } catch (error) {
      console.error("[Telegram Login Error]:", error);

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch (logoutError) {
        console.error("[Telegram Stale Session Clear Error]:", logoutError);
      }

      setErrorMessage(
        getErrorMessage(error, "تعذر التحقق من حساب تليجرام الحالي. أعد فتح التطبيق من البوت.")
      );
      authProcessedRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    const tg = window.Telegram?.WebApp;

    const showBrowserAuth = () => {
      if (disposed) return;

      setIsOutsideTelegram(true);
      setLoading(false);

      const callbackError = new URLSearchParams(window.location.search).get("error");
      if (callbackError) {
        setErrorMessage("لم يكتمل تسجيل الدخول عبر تليجرام. يمكنك المحاولة مجددًا.");
      }
    };

    const prepareBrowserAuth = () => {
      if (!browserPreparationRef.current) {
        // A Telegram cookie must never override the Clerk account selected here.
        browserPreparationRef.current = fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        })
          .then(() => undefined)
          .catch((error) => {
            console.error("[Telegram Session Cleanup Error]:", error);
          });
      }

      void browserPreparationRef.current.finally(showBrowserAuth);
    };

    const detectTelegramAccount = () => {
      try {
        tg?.ready();
        tg?.expand();
      } catch (error) {
        console.error("[Telegram WebApp Init Error]:", error);
      }

      let initData = tg?.initData || "";
      const unsafeUser = tg?.initDataUnsafe?.user || null;

      if (!initData) {
        initData = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("tgWebAppData") || "";
      }
      if (!initData) {
        initData = new URLSearchParams(window.location.search).get("tgWebAppData") || "";
      }

      const isTelegramApp = Boolean(initData || unsafeUser);

      if (isTelegramApp) {
        setIsOutsideTelegram(false);
        void processTelegramAuth({ initData, telegramData: unsafeUser });
        return;
      }

      prepareBrowserAuth();
    };

    const handleResume = () => detectTelegramAccount();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") detectTelegramAccount();
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    try {
      tg?.onEvent?.("activated", handleResume);
    } catch (error) {
      console.error("[Telegram Activated Listener Error]:", error);
    }

    detectTelegramAccount();

    return () => {
      disposed = true;
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      try {
        tg?.offEvent?.("activated", handleResume);
      } catch (error) {
        console.error("[Telegram Activated Listener Cleanup Error]:", error);
      }
    };
  }, [processTelegramAuth]);

  const startTelegramOidc = () => {
    window.location.assign("/api/auth/telegram/start");
  };

  return (
    <section className="relative w-full max-w-[34rem]" aria-labelledby="auth-card-title">
      <div className="pointer-events-none absolute -inset-px rounded-[2rem] bg-gradient-to-b from-white/25 via-white/[0.04] to-red-500/20" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d18]/92 p-5 shadow-[0_32px_100px_rgba(0,0,0,0.72)] backdrop-blur-2xl sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-red-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 size-64 rounded-full bg-sky-500/10 blur-3xl" />

        <header className="relative mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="text-right">
            <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.32em] text-red-400">
              Secure Access
            </p>
            <h1 id="auth-card-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {mode === "sign-in" ? "مرحبًا بعودتك" : "ابدأ رحلتك السينمائية"}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              {mode === "sign-in"
                ? "ادخل إلى قوائمك وغرف المشاهدة بأمان."
                : "أنشئ حسابك واحفظ أفلامك وغرفك في مكان واحد."}
            </p>
          </div>
          <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-2xl text-red-400 shadow-[0_0_30px_rgba(229,9,20,0.18)] sm:flex">
            <i className="fa-solid fa-clapperboard" aria-hidden="true" />
          </div>
        </header>

        {loading && !isOutsideTelegram ? (
          <div className="relative flex min-h-64 flex-col items-center justify-center gap-5 rounded-3xl border border-red-500/20 bg-red-950/15 p-8 text-center">
            <div className="relative size-16">
              <div className="absolute inset-0 rounded-full border border-red-400/20" />
              <div className="absolute inset-1 animate-spin rounded-full border-[3px] border-red-500/20 border-t-red-500" />
              <i className="fa-brands fa-telegram absolute inset-0 flex items-center justify-center text-xl text-sky-400" />
            </div>
            <div>
              <p className="text-base font-black text-white">جاري مزامنة حساب تليجرام الحالي</p>
              <p className="mt-2 text-xs font-semibold leading-6 text-slate-400">
                نتحقق من بيانات التطبيق الموقعة ثم نحدّث الجلسة تلقائيًا.
              </p>
            </div>
          </div>
        ) : isOutsideTelegram ? (
          <div className="relative">
            {errorMessage && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-950/35 p-4 text-sm font-bold leading-6 text-red-100">
                <i className="fa-solid fa-circle-exclamation mt-1 text-red-400" aria-hidden="true" />
                <p>{errorMessage}</p>
              </div>
            )}

            <button
              type="button"
              onClick={startTelegramOidc}
              className="group flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl border border-sky-400/25 bg-gradient-to-l from-sky-500/15 to-blue-500/10 px-5 py-3.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(14,165,233,0.1)] transition hover:border-sky-300/45 hover:from-sky-500/25 hover:to-blue-500/20 active:scale-[0.99]"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-sky-400/15 text-xl text-sky-300 transition group-hover:scale-105">
                <i className="fa-brands fa-telegram" aria-hidden="true" />
              </span>
              <span>المتابعة مباشرة عبر تليجرام</span>
            </button>

            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[0.68rem] font-black tracking-wider text-slate-500">أو حساب المنصة</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {mode === "sign-in" ? (
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/home"
                appearance={clerkAppearance}
              />
            ) : (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/home"
                appearance={clerkAppearance}
              />
            )}
          </div>
        ) : (
          <div className="relative flex min-h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-red-400/25 bg-red-950/30 p-7 text-center">
            <i className="fa-solid fa-triangle-exclamation text-3xl text-red-400" aria-hidden="true" />
            <p className="text-sm font-bold leading-7 text-red-100">
              {errorMessage || "تعذر التحقق من حساب تليجرام الحالي."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#e50914] px-6 py-3 text-sm font-black text-white transition hover:bg-red-700 active:scale-[0.98]"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-[0.68rem] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <i className="fa-solid fa-shield-halved text-emerald-400" aria-hidden="true" />
            جلسة مشفرة
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="fa-solid fa-key text-amber-400" aria-hidden="true" />
            يدعم التحقق المتعدد
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="fa-solid fa-user-lock text-sky-400" aria-hidden="true" />
            خصوصية الحساب
          </span>
        </div>
      </div>
    </section>
  );
}
