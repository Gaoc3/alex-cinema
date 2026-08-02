"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  configureTelegramWebApp,
  getTelegramLaunchPayload,
  isTelegramWebAppContext,
} from "@/lib/telegramWebAppClient";
import AuthCardSkeleton from "@/components/skeleton/AuthCardSkeleton";

interface CustomAuthCardProps {
  mode?: "sign-in" | "sign-up";
  redirectUrl?: string;
}

interface TelegramAuthPayload {
  initData: string;
  telegramData: TelegramWebAppUser | null;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) abortFromUpstream();
  else upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
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
    colorMutedForeground: "#cbd5e1",
    colorBackground: "transparent",
    colorInput: "rgba(20, 35, 58, 0.96)",
    colorInputForeground: "#ffffff",
    colorRing: "rgba(229, 9, 20, 0.42)",
    colorBorder: "rgba(255, 255, 255, 0.16)",
    fontFamily: "Cairo, sans-serif",
    fontFamilyButtons: "Cairo, sans-serif",
    borderRadius: "1rem",
    spacing: "1rem",
  },
  elements: {
    rootBox: { width: "100%", minWidth: 0, maxWidth: "100%", overflow: "visible" },
    cardBox: { width: "100%", minWidth: 0, maxWidth: "100%", overflow: "visible", boxShadow: "none" },
    card: {
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      padding: 0,
      gap: "0.75rem",
      border: 0,
      background: "transparent",
      overflow: "visible",
      boxSizing: "border-box" as const,
      boxShadow: "none",
    },
    header: { display: "none" as const },
    headerTitle: { display: "none" as const },
    headerSubtitle: { display: "none" as const },
    main: { width: "100%", minWidth: 0, maxWidth: "100%", gap: "0.875rem", overflow: "visible" },
    socialButtonsRoot: { width: "100%", minWidth: 0, maxWidth: "100%", gap: "0.5rem", padding: "0 1px" },
    socialButtonsBlockButton: {
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      minHeight: "3rem",
      margin: 0,
      boxSizing: "border-box" as const,
      border: "1px solid rgba(255, 255, 255, 0.28)",
      borderRadius: "1rem",
      background: "linear-gradient(135deg, rgba(51, 65, 85, 0.92), rgba(30, 41, 59, 0.96))",
      color: "#ffffff",
      boxShadow: "0 10px 28px rgba(0, 0, 0, 0.3)",
    },
    socialButtonsBlockButtonText: { color: "#ffffff", fontWeight: 800 },
    socialButtonsProviderIcon: "size-5",
    dividerRow: { margin: "0.75rem 0" },
    dividerLine: { background: "rgba(255, 255, 255, 0.14)" },
    dividerText: { padding: "0 0.75rem", color: "#cbd5e1", fontSize: "0.75rem", fontWeight: 700 },
    form: { width: "100%", minWidth: 0, maxWidth: "100%", gap: "0.75rem", padding: "0 1px" },
    formFieldRow: { gap: "0.5rem" },
    formFieldLabel: "mb-1.5 text-sm font-extrabold text-slate-200",
    formFieldInput: {
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      minHeight: "3rem",
      padding: "0 1rem",
      boxSizing: "border-box" as const,
      direction: "ltr" as const,
      textAlign: "left" as const,
      border: "1px solid rgba(148, 163, 184, 0.28)",
      borderRadius: "1rem",
      background: "rgba(20, 35, 58, 0.96)",
      color: "#ffffff",
      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    },
    formFieldInputShowPasswordButton: "text-slate-400 hover:text-white",
    formFieldAction: "font-bold text-red-400 hover:text-red-300",
    formFieldErrorText: "mt-1 text-xs font-bold text-red-300",
    formButtonPrimary:
      "min-h-12 w-full max-w-full rounded-2xl border border-red-400/25 bg-gradient-to-l from-red-700 via-[#e50914] to-red-600 text-sm font-black text-white shadow-[0_12px_30px_rgba(229,9,20,0.3)] transition hover:brightness-110 hover:shadow-[0_16px_38px_rgba(229,9,20,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-[0.99]",
    formResendCodeLink: "font-extrabold text-red-400 hover:text-red-300",
    otpCodeFieldInput:
      "border-white/15 bg-slate-950/80 text-white [direction:ltr] focus:border-red-500 focus:ring-red-500/20",
    identityPreview: "rounded-2xl border border-white/10 bg-white/[0.05]",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-red-400 hover:text-red-300",
    alternativeMethodsBlockButton:
      "w-full max-w-full rounded-2xl border border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.09]",
    footer: { marginTop: 0, paddingTop: 0, background: "transparent" },
    footerAction: { display: "none" as const },
    footerPages: { display: "none" as const },
    footerItem: { display: "none" as const },
    lastAuthenticationStrategyBadge: { display: "none" as const },
  },
  captcha: { theme: "dark" as const },
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function CustomAuthCard({ mode = "sign-in", redirectUrl = "/home" }: CustomAuthCardProps) {
  const [isTelegramContext, setIsTelegramContext] = useState<boolean>(true);
  const [isOutsideTelegram, setIsOutsideTelegram] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const authProcessedRef = useRef(false);
  const telegramAuthControllerRef = useRef<AbortController | null>(null);
  const browserPreparationControllerRef = useRef<AbortController | null>(null);
  const browserPreparationRef = useRef<Promise<void> | null>(null);
  const telegramDetectionTimerRef = useRef<number | null>(null);
  const telegramDetectionAttemptsRef = useRef(0);

  const processTelegramAuth = useCallback(async (payload: TelegramAuthPayload) => {
    if (authProcessedRef.current) return;
    authProcessedRef.current = true;
    setIsTelegramContext(true);
    setIsOutsideTelegram(false);
    setLoading(true);
    setErrorMessage(null);
    const operationController = new AbortController();
    telegramAuthControllerRef.current?.abort();
    telegramAuthControllerRef.current = operationController;

    try {
      const response = await fetchWithTimeout("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: operationController.signal,
        body: JSON.stringify(payload),
      }, 15_000);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "فشل تسجيل الدخول عبر تليجرام.");
      }

      window.location.replace("/home?tgWebApp=true");
    } catch (error) {
      if (operationController.signal.aborted) return;
      console.error("[Telegram Login Error]:", error);

      setErrorMessage(
        getErrorMessage(error, "تعذر التحقق من حساب تليجرام الحالي. أعد فتح التطبيق من البوت.")
      );
      authProcessedRef.current = false;
      setLoading(false);
    } finally {
      if (telegramAuthControllerRef.current === operationController) {
        telegramAuthControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    const tg = window.Telegram?.WebApp;

    const showBrowserAuth = () => {
      if (disposed) return;

      setIsOutsideTelegram(true);
      setIsTelegramContext(false);
      setLoading(false);

      const callbackError = new URLSearchParams(window.location.search).get("error");
      if (callbackError) {
        setErrorMessage("لم يكتمل تسجيل الدخول عبر تليجرام. يمكنك المحاولة مجددًا.");
      }
    };

    const prepareBrowserAuth = () => {
      if (!browserPreparationRef.current) {
        const operationController = new AbortController();
        browserPreparationControllerRef.current?.abort();
        browserPreparationControllerRef.current = operationController;
        const sessionCheck = fetchWithTimeout("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
          signal: operationController.signal,
        }, 6_000)
          .then(async (response) => {
            if (disposed) return;
            if (!response.ok) {
              showBrowserAuth();
              return;
            }

            const data = await response.json().catch(() => null);
            if (data?.authenticated) {
              window.location.replace("/home");
              return;
            }

            showBrowserAuth();
          })
          .catch((error) => {
            console.error("[Existing Session Check Error]:", error);
            showBrowserAuth();
          });

        browserPreparationRef.current = sessionCheck.finally(() => {
          if (browserPreparationControllerRef.current === operationController) {
            browserPreparationControllerRef.current = null;
          }
          browserPreparationRef.current = null;
        });
      }
    };

    const detectTelegramAccount = () => {
      configureTelegramWebApp();

      const { initData, unsafeUser } = getTelegramLaunchPayload();

      const isTelegramApp = Boolean(initData || unsafeUser);

      if (isTelegramApp) {
        telegramDetectionAttemptsRef.current = 0;
        void processTelegramAuth({ initData, telegramData: unsafeUser });
        return;
      }

      // The SDK can appear a few frames before Telegram injects initData.
      // Never expose an external OAuth surface during that gap.
      if (isTelegramWebAppContext()) {
        setIsTelegramContext(true);
        setIsOutsideTelegram(false);

        if (telegramDetectionAttemptsRef.current < 20) {
          setLoading(true);
          telegramDetectionAttemptsRef.current += 1;
          if (telegramDetectionTimerRef.current !== null) {
            window.clearTimeout(telegramDetectionTimerRef.current);
          }
          telegramDetectionTimerRef.current = window.setTimeout(detectTelegramAccount, 150);
          return;
        }

        setLoading(false);
        setErrorMessage("تعذر قراءة حساب تليجرام الحالي. أغلق الويب آب وافتحه من البوت مجددًا.");
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
      telegramAuthControllerRef.current?.abort();
      telegramAuthControllerRef.current = null;
      browserPreparationControllerRef.current?.abort();
      browserPreparationControllerRef.current = null;
      if (telegramDetectionTimerRef.current !== null) {
        window.clearTimeout(telegramDetectionTimerRef.current);
        telegramDetectionTimerRef.current = null;
      }
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
    if (isTelegramWebAppContext()) {
      setIsOutsideTelegram(false);
      setIsTelegramContext(true);
      setLoading(false);
      setErrorMessage("تسجيل الدخول داخل تليجرام يتم تلقائيًا. أعد فتح الويب آب من البوت.");
      return;
    }
    window.location.assign("/api/auth/telegram/start");
  };

  if (loading && !isOutsideTelegram) {
    return <AuthCardSkeleton mode={mode} />;
  }

  return (
    <section
      className="relative min-w-0 w-full max-w-[29rem] px-px"
      aria-label={mode === "sign-in" ? "تسجيل الدخول إلى أليكس سينما" : "إنشاء حساب أليكس سينما"}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/30 via-white/[0.06] to-red-500/22" />
      <div className="relative isolate rounded-[1.75rem] border border-white/20 bg-[#102139]/96 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-6">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
          <div className="absolute -right-24 -top-24 size-64 rounded-full bg-red-600/15 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 size-64 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        {isOutsideTelegram ? (
          <div className="relative">
            {/* Header Title at VERY TOP of Card */}
            <div className="mb-5 text-right border-b border-white/10 pb-4">
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {mode === "sign-in" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-300">
                {mode === "sign-in" ? "مرحباً بك! اختر وسيلة الدخول المناسبة" : "أنشئ حسابك واستمتع بالمشاهدة والدردشة المباشرة"}
              </p>
            </div>

            {errorMessage && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-950/35 p-4 text-sm font-bold leading-6 text-red-100">
                <i className="fa-solid fa-circle-exclamation mt-1 text-red-400" aria-hidden="true" />
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Quick Telegram OAuth Button */}
            <button
              type="button"
              onClick={startTelegramOidc}
              className="group flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-sky-400/35 bg-gradient-to-l from-sky-500/25 to-blue-500/20 px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(14,165,233,0.16)] transition hover:border-sky-200/55 hover:from-sky-500/35 hover:to-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 active:scale-[0.99] cursor-pointer"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-sky-400/20 text-lg text-sky-300 transition group-hover:scale-105">
                <i className="fa-brands fa-telegram" aria-hidden="true" />
              </span>
              <span>الدخول السريع عبر تليجرام</span>
            </button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-bold text-slate-300">أو عبر البريد الإلكتروني</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {mode === "sign-in" ? (
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl={`/sign-up${redirectUrl !== '/home' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
                forceRedirectUrl={redirectUrl}
                fallbackRedirectUrl={redirectUrl}
                appearance={clerkAppearance}
              />
            ) : (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl={`/sign-in${redirectUrl !== '/home' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
                forceRedirectUrl={redirectUrl}
                fallbackRedirectUrl={redirectUrl}
                appearance={clerkAppearance}
              />
            )}

            <div className="mt-4 flex min-w-0 flex-col items-stretch gap-3 rounded-2xl border border-white/15 bg-white/[0.065] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] min-[440px]:flex-row min-[440px]:items-center min-[440px]:justify-between">
              <div className="min-w-0 text-center min-[440px]:text-right">
                <p className="text-sm font-black text-slate-100 min-[440px]:whitespace-nowrap">
                  {mode === "sign-in" ? "ليس لديك حساب بعد؟" : "لديك حساب بالفعل؟"}
                </p>
              </div>
              <Link
                href={
                  mode === "sign-in"
                    ? `/sign-up${redirectUrl !== '/home' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`
                    : `/sign-in${redirectUrl !== '/home' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`
                }
                className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/12 px-4 py-2 text-sm font-black text-red-200 shadow-[0_8px_22px_rgba(229,9,20,0.12)] transition hover:border-red-300/50 hover:bg-red-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 min-[440px]:w-auto"
              >
                <i className={`fa-solid ${mode === "sign-in" ? "fa-user-plus" : "fa-arrow-right-to-bracket"} text-xs`} aria-hidden="true" />
                <span>{mode === "sign-in" ? "إنشاء حساب جديد" : "تسجيل الدخول"}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div role="alert" className="relative flex min-h-52 flex-col items-center justify-center gap-4 rounded-3xl border border-red-400/25 bg-red-950/30 p-6 text-center">
            <i className="fa-solid fa-triangle-exclamation text-3xl text-red-400" aria-hidden="true" />
            <p className="text-sm font-bold leading-7 text-red-100">
              {errorMessage || "تعذر التحقق من حساب تليجرام الحالي."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#e50914] px-6 py-3 text-sm font-black text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-[0.98]"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
