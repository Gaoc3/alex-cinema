"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import toast from "react-hot-toast";

interface CustomAuthCardProps {
  mode?: "sign-in" | "sign-up";
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        expand: () => void;
      };
    };
  }
}

export default function CustomAuthCard({ mode = "sign-in" }: CustomAuthCardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOutsideTelegram, setIsOutsideTelegram] = useState<boolean>(false);
  const authProcessedRef = useRef<boolean>(false);

  // Email / Password Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  // Official Telegram OpenID Connect Direct Authorization Link Trigger
  const handleOidcTelegramAuth = () => {
    const oidcUrl = "https://oauth.telegram.org/auth?client_id=8814857532&redirect_uri=https%3A%2F%2Fcinax.live%2Fapi%2Fauth%2Ftelegram%2Fcallback&response_type=code&scope=openid%20profile";
    window.location.href = oidcUrl;
  };

  // GitHub Social Auth Trigger via Clerk
  const handleGitHubAuth = async () => {
    try {
      if (mode === "sign-in" && isSignInLoaded && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_github",
          redirectUrl: "/sign-in/sso-callback",
          redirectUrlComplete: "/",
        });
      } else if (mode === "sign-up" && isSignUpLoaded && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_github",
          redirectUrl: "/sign-up/sso-callback",
          redirectUrlComplete: "/",
        });
      }
    } catch (err: any) {
      console.error("[GitHub Auth Error]:", err);
      toast.error("فشل تسجيل الدخول عبر GitHub.");
    }
  };

  // Authenticate user with server (Telegram App initData)
  const processTelegramAuth = useCallback(
    async (payload: { id_token?: string; initData?: string; telegramData?: any }) => {
      if (authProcessedRef.current) return;
      authProcessedRef.current = true;

      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "فشل تسجيل الدخول عبر تليجرام.");
        }

        toast.success(`أهلاً بك يا ${data.user?.name || ""}! 🍿`, { id: "tgAuth" });

        // Redirect immediately to home page
        window.location.replace("/home");
      } catch (err: any) {
        console.error("[Telegram Login Error]:", err);
        setErrorMessage(err.message || "حدث خطأ أثناء الاتصال بالسيرفر.");
        authProcessedRef.current = false;
        setLoading(false);
      }
    },
    []
  );

  // Main Detection Effect for Telegram Mini App
  useEffect(() => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {}
    }

    let initData = tg?.initData || "";
    let unsafeUser = tg?.initDataUnsafe?.user || null;

    if (typeof window !== "undefined") {
      if (!initData) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        initData = hashParams.get("tgWebAppData") || "";
      }
      if (!initData) {
        const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ""));
        initData = searchParams.get("tgWebAppData") || "";
      }
    }

    const isTelegramApp = Boolean(
      (tg && (initData || unsafeUser)) ||
      initData ||
      unsafeUser ||
      (typeof window !== "undefined" && (
        window.location.hash.includes("tgWebAppData") ||
        window.location.search.includes("tgWebAppData")
      ))
    );

    if (isTelegramApp) {
      processTelegramAuth({ initData, telegramData: unsafeUser });
    } else {
      setIsOutsideTelegram(true);
      setLoading(false);
    }
  }, [processTelegramAuth]);

  // Handle Email/Password Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === "sign-in") {
        if (!isSignInLoaded || !signIn) return;
        const result = await signIn.create({
          identifier: email,
          password: password,
        });

        if (result.status === "complete") {
          await setSignInActive({ session: result.createdSessionId });
          toast.success("تم تسجيل الدخول بنجاح! 🍿");
          window.location.replace("/home");
        } else {
          console.log("[Sign In Result]:", result);
        }
      } else {
        if (!isSignUpLoaded || !signUp) return;
        const result = await signUp.create({
          emailAddress: email,
          password: password,
        });

        if (result.status === "complete") {
          await setSignUpActive({ session: result.createdSessionId });
          toast.success("تم إنشاء الحساب بنجاح! 🍿");
          window.location.replace("/home");
        } else {
          console.log("[Sign Up Result]:", result);
        }
      }
    } catch (err: any) {
      console.error("[Email Auth Error]:", err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "حدث خطأ أثناء المصادقة.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[clamp(24rem,42vw,48rem)] transition-all duration-300 flex flex-col items-center justify-center my-auto px-2 sm:px-4 dir-rtl">
      <div className="w-full border-2 border-white/30 shadow-[0_35px_100px_rgba(0,0,0,0.9)] bg-[#131b2e]/95 backdrop-blur-3xl rounded-[2.5rem] p-[clamp(1.5rem,3.5vw,3.25rem)] text-white relative flex flex-col items-center justify-center">
        
        {/* Header Logo */}
        <div className="text-center mb-6 w-full">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide mb-1.5">
            ALEX <span className="text-[#e50914]">CINEMA</span>
          </h2>
          <p className="text-xs sm:text-sm font-bold text-gray-300">
            منصة المشاهدة الجماعية والأفلام
          </p>
        </div>

        {/* Loading Spinner for Telegram App */}
        {loading && (
          <div className="w-full flex flex-col items-center gap-3 my-6 bg-red-950/40 p-6 rounded-2xl border border-red-500/30">
            <div className="w-10 h-10 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-black text-white">
              جاري المصادقة والدخول التلقائي بحساب تليجرام...
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="w-full mb-4 text-center">
            <p className="text-red-300 text-xs sm:text-sm bg-red-950/80 p-3 rounded-2xl border-2 border-red-500/50 leading-relaxed font-bold mb-2">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="px-5 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Web Browser Auth Section */}
        {isOutsideTelegram && !loading && (
          <div className="w-full space-y-4">
            
            {/* Social Login Buttons Container */}
            <div className="w-full flex flex-col gap-3">
              
              {/* Pure Official Telegram OIDC Button */}
              <button
                type="button"
                id="telegram-oidc-login-btn"
                onClick={handleOidcTelegramAuth}
                className="w-full bg-[#161e33] hover:bg-[#1d2845] border-2 border-white/30 hover:border-blue-400 transition-all duration-300 text-white font-extrabold p-3.5 sm:p-4 rounded-2xl shadow-md flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer min-h-[52px] sm:min-h-[56px] text-sm sm:text-base group"
              >
                <i className="fa-brands fa-telegram text-[#24A1DE] text-2xl group-hover:scale-110 transition-transform"></i>
                <span className="text-white font-black">تسجيل الدخول بـ Telegram</span>
              </button>

              {/* GitHub OAuth Button */}
              <button
                type="button"
                onClick={handleGitHubAuth}
                className="w-full bg-[#161e33] hover:bg-[#1d2845] border-2 border-white/30 hover:border-white transition-all duration-300 text-white font-extrabold p-3.5 sm:p-4 rounded-2xl shadow-md flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer min-h-[52px] sm:min-h-[56px] text-sm sm:text-base group"
              >
                <i className="fa-brands fa-github text-white text-2xl group-hover:scale-110 transition-transform"></i>
                <span className="text-white font-black">المتابعة مع GitHub</span>
              </button>

            </div>

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 bg-white/20 h-[1.5px]"></div>
              <span className="text-gray-300 font-extrabold text-xs sm:text-sm px-4">أو</span>
              <div className="flex-1 bg-white/20 h-[1.5px]"></div>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4 dir-rtl text-right">
              <div>
                <label className="text-gray-200 font-extrabold text-xs sm:text-sm mb-2 block">
                  العنوان الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  placeholder="أدخل بريدك الإلكتروني هنا..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161e33] border-2 border-white/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/30 text-white placeholder:text-gray-400 font-bold rounded-2xl p-3.5 sm:p-4 transition-all text-sm sm:text-base shadow-inner min-h-[52px] sm:min-h-[56px] text-right"
                />
              </div>

              <div>
                <label className="text-gray-200 font-extrabold text-xs sm:text-sm mb-2 block">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  placeholder="أدخل كلمة المرور..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161e33] border-2 border-white/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/30 text-white placeholder:text-gray-400 font-bold rounded-2xl p-3.5 sm:p-4 transition-all text-sm sm:text-base shadow-inner min-h-[52px] sm:min-h-[56px] text-right"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#e50914] via-[#dc2626] to-[#b91c1c] hover:from-[#f87171] hover:to-[#dc2626] border-2 border-red-500/50 transition-all duration-300 text-white font-black shadow-[0_10px_35px_rgba(229,9,20,0.6)] hover:shadow-[0_12px_45px_rgba(229,9,20,0.85)] py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base min-h-[52px] sm:min-h-[56px] active:scale-[0.98] cursor-pointer mt-3 flex items-center justify-center text-center disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : mode === "sign-in" ? (
                  "متابعة"
                ) : (
                  "إنشاء حساب"
                )}
              </button>
            </form>

          </div>
        )}

      </div>

      {/* Footer Navigation Link */}
      {isOutsideTelegram && (
        <div className="mt-6 text-center z-20">
          {mode === "sign-in" ? (
            <Link 
              href="/sign-up" 
              className="text-sm sm:text-base font-medium text-gray-300 hover:text-white transition-colors inline-flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>ليس لديك حساب؟</span>
              <span className="text-[#e50914] group-hover:text-white font-black relative py-0.5 transition-colors duration-300 after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-0 after:h-[2px] after:bg-[#e50914] group-hover:after:w-full after:transition-all after:duration-300">
                أنشئ حساباً الآن
              </span>
            </Link>
          ) : (
            <Link 
              href="/sign-in" 
              className="text-sm sm:text-base font-medium text-gray-300 hover:text-white transition-colors inline-flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>لديك حساب بالفعل؟</span>
              <span className="text-[#e50914] group-hover:text-white font-black relative py-0.5 transition-colors duration-300 after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-0 after:h-[2px] after:bg-[#e50914] group-hover:after:w-full after:transition-all after:duration-300">
                سجل الدخول
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
