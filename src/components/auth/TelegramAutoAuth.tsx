"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import {
  configureTelegramWebApp,
  getTelegramLaunchPayload,
  isTelegramWebAppContext,
} from "@/lib/telegramWebAppClient";

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

function getTelegramUserId(
  initData: string,
  unsafeUser: TelegramWebAppUser | null | undefined,
): string | null {
  try {
    const signedUser = new URLSearchParams(initData).get("user");
    if (signedUser) {
      const parsedUser = JSON.parse(signedUser);
      if (parsedUser?.id !== undefined && parsedUser?.id !== null) {
        return String(parsedUser.id);
      }
    }
  } catch (error) {
    console.error("[Telegram WebApp User Parse Error]:", error);
  }

  return unsafeUser?.id !== undefined && unsafeUser?.id !== null
    ? String(unsafeUser.id)
    : null;
}

function getAuthenticatedTelegramId(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;

  const identity = user as Record<string, unknown>;
  if (identity.telegramId !== undefined && identity.telegramId !== null) {
    return String(identity.telegramId);
  }

  if (typeof identity.clerkId === "string" && identity.clerkId.startsWith("telegram_")) {
    return identity.clerkId.slice("telegram_".length);
  }

  return null;
}

function readSessionValue(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Authentication must continue in privacy-restricted WebViews.
  }
}

function removeSessionValue(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Authentication must continue in privacy-restricted WebViews.
  }
}

export default function TelegramAutoAuth() {
  const { refetchUser } = useUnifiedAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let disposed = false;
    let syncInFlight = false;
    let navigationPending = false;
    let syncTimer: number | null = null;
    let retryCount = 0;
    const operationController = new AbortController();

    const initialTg = window.Telegram?.WebApp;
    const isImmersiveRoute =
      pathname?.startsWith("/room/") || pathname?.startsWith("/watch/");
    const isStoredTg = isTelegramWebAppContext();

    const refreshTelegramChrome = () => {
      configureTelegramWebApp({ immersive: Boolean(isImmersiveRoute) });
    };

    if (isStoredTg) refreshTelegramChrome();

    window.addEventListener("resize", refreshTelegramChrome, { passive: true });
    window.addEventListener("orientationchange", refreshTelegramChrome, { passive: true });
    initialTg?.onEvent?.("viewportChanged", refreshTelegramChrome);

    const ownsTelegramAuth =
      window.location.pathname.startsWith("/tg-app") ||
      window.location.pathname.startsWith("/sign-in") ||
      window.location.pathname.startsWith("/sign-up");

    // These pages authenticate and redirect explicitly, so avoid two competing writers.
    if (ownsTelegramAuth) {
      return () => {
        window.removeEventListener("resize", refreshTelegramChrome);
        window.removeEventListener("orientationchange", refreshTelegramChrome);
        initialTg?.offEvent?.("viewportChanged", refreshTelegramChrome);
      };
    }

    const readLaunchPayload = () => {
      return getTelegramLaunchPayload();
    };

    const syncTelegramAccount = async () => {
      if (disposed || syncInFlight || navigationPending) return;

      const { initData, unsafeUser } = readLaunchPayload();
      if (!initData) {
        if (isTelegramWebAppContext() && retryCount < 12) {
          retryCount += 1;
          if (syncTimer !== null) window.clearTimeout(syncTimer);
          syncTimer = window.setTimeout(() => void syncTelegramAccount(), 250);
        }
        return;
      }

      // The SDK may arrive after React has mounted. Configure it immediately
      // once signed launch data becomes available so the first user swipe is
      // kept inside the Mini App instead of collapsing the Telegram WebView.
      refreshTelegramChrome();

      const currentTgUserId = getTelegramUserId(initData, unsafeUser);
      let loggedInTgId: string | null = null;
      let wasAuthenticated = false;
      let sessionCheckKnown = false;

      syncInFlight = true;

      try {
        try {
          const meResponse = await fetchWithTimeout("/api/auth/me", {
            cache: "no-store",
            credentials: "same-origin",
            signal: operationController.signal,
          }, 6_000);
          const meData = meResponse.ok
            ? await meResponse.json()
            : { authenticated: false, user: null };

          if (meResponse.ok) {
            sessionCheckKnown = true;
            wasAuthenticated = Boolean(meData?.authenticated);
            loggedInTgId = getAuthenticatedTelegramId(meData?.user);
          }
        } catch (error) {
          console.error("[Telegram Current Session Check Error]:", error);
        }

        if (sessionCheckKnown && wasAuthenticated && currentTgUserId && loggedInTgId === currentTgUserId) {
          retryCount = 0;
          writeSessionValue("alexTelegramActiveUser", currentTgUserId);
          removeSessionValue("alexTelegramReloadFor");
          await refetchUser();
          return;
        }

        const authResponse = await fetchWithTimeout("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal: operationController.signal,
          body: JSON.stringify({
            initData,
            telegramData: unsafeUser,
          }),
        }, 15_000);
        const authData = await authResponse.json().catch(() => null);

        if (!authResponse.ok || !authData?.success) {
          throw new Error(authData?.error || "Telegram authentication failed.");
        }

        const authenticatedTgId = getAuthenticatedTelegramId(authData.user);
        if (currentTgUserId && authenticatedTgId !== currentTgUserId) {
          throw new Error("Telegram account identity mismatch.");
        }

        const previousTelegramId = readSessionValue("alexTelegramActiveUser");
        const accountChanged = Boolean(
          authenticatedTgId && (
            (sessionCheckKnown && (!wasAuthenticated || loggedInTgId !== authenticatedTgId))
            || (!sessionCheckKnown && previousTelegramId && previousTelegramId !== authenticatedTgId)
          )
        );

        if (disposed) return;

        retryCount = 0;
        if (authenticatedTgId) {
          writeSessionValue("alexTelegramActiveUser", authenticatedTgId);
        }

        await refetchUser();

        const reloadMarker = readSessionValue("alexTelegramReloadFor");
        if (accountChanged && authenticatedTgId && reloadMarker !== authenticatedTgId) {
          writeSessionValue("alexTelegramReloadFor", authenticatedTgId);
          navigationPending = true;
          window.location.reload();
          return;
        }
      } catch (error) {
        if (disposed || operationController.signal.aborted) return;
        console.error("[Telegram Account Sync Error]:", error);
        retryCount += 1;
        const retryDelay = Math.min(20_000, 1_000 * (2 ** Math.min(retryCount - 1, 4)));
        if (syncTimer !== null) window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(() => void syncTelegramAccount(), retryDelay);
      } finally {
        syncInFlight = false;
      }
    };

    const scheduleSync = (delay = 180) => {
      if (disposed || navigationPending) return;
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => void syncTelegramAccount(), delay);
    };

    const handleResume = () => {
      refreshTelegramChrome();
      scheduleSync();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      }
    };

    const preventEmbeddedOAuth = (event: MouseEvent) => {
      if (!isTelegramWebAppContext() || !(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      let targetUrl: URL;
      try {
        targetUrl = new URL(href, window.location.href);
      } catch {
        return;
      }

      const isAuthNavigation =
        targetUrl.pathname.startsWith("/api/auth/telegram/start")
        || targetUrl.pathname.includes("/sso-callback")
        || targetUrl.pathname.includes("/__clerk")
        || /(^|\.)oauth\.telegram\.org$/i.test(targetUrl.hostname)
        || /(^|\.)clerk\.(?:com|accounts\.dev)$/i.test(targetUrl.hostname)
        || targetUrl.pathname.toLowerCase().includes("/oauth");

      if (!isAuthNavigation) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      scheduleSync(0);
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", preventEmbeddedOAuth, true);

    try {
      initialTg?.onEvent?.("activated", handleResume);
    } catch (error) {
      console.error("[Telegram Activated Listener Error]:", error);
    }

    scheduleSync(0);

    return () => {
      disposed = true;
      operationController.abort();
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      window.removeEventListener("resize", refreshTelegramChrome);
      window.removeEventListener("orientationchange", refreshTelegramChrome);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", preventEmbeddedOAuth, true);

      try {
        initialTg?.offEvent?.("activated", handleResume);
        initialTg?.offEvent?.("viewportChanged", refreshTelegramChrome);
      } catch (error) {
        console.error("[Telegram Activated Listener Cleanup Error]:", error);
      }

    };
  }, [pathname, refetchUser]);

  return null;
}
