"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUnifiedAuth } from "@/components/auth/UnifiedAuthProvider";
import { getTelegramLaunchPayload } from "@/lib/telegramWebAppClient";

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

export default function TelegramAutoAuth() {
  const { refetchUser } = useUnifiedAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let disposed = false;
    let syncInFlight = false;
    let navigationPending = false;
    const operationController = new AbortController();

    const initialTg = window.Telegram?.WebApp;
    const isImmersiveRoute =
      pathname?.startsWith("/room/") || pathname?.startsWith("/watch/");
    const isStoredTg =
      sessionStorage.getItem("isTgWebApp") === "true" ||
      window.location.search.includes("tgWebApp") ||
      Boolean(initialTg?.initData || initialTg?.initDataUnsafe?.user);

    if (isStoredTg) {
      document.body.classList.add("is-telegram-webapp");
      document.documentElement.classList.add("is-telegram-webapp");
      try {
        sessionStorage.setItem("isTgWebApp", "true");
      } catch (error) {
        console.error("[Telegram WebApp Session Flag Error]:", error);
      }
    }

    if (initialTg && isStoredTg) {
      try {
        initialTg.ready();
        initialTg.expand();

        if (initialTg.isVersionAtLeast?.("6.1") && initialTg.setHeaderColor) {
          initialTg.setHeaderColor("#050505");
        }
        if (initialTg.isVersionAtLeast?.("6.1") && initialTg.setBackgroundColor) {
          initialTg.setBackgroundColor("#050505");
        }
        if (isImmersiveRoute) {
          if (initialTg.isVersionAtLeast?.("8.0") && initialTg.requestFullscreen) {
            initialTg.requestFullscreen();
          }
          if (initialTg.isVersionAtLeast?.("7.7") && initialTg.disableVerticalSwipes) {
            initialTg.disableVerticalSwipes();
            initialTg.isVerticalSwipesEnabled = false;
          }
          if (initialTg.isVersionAtLeast?.("6.2") && initialTg.enableClosingConfirmation) {
            initialTg.enableClosingConfirmation();
          }
        } else {
          if (initialTg.isVersionAtLeast?.("8.0") && initialTg.exitFullscreen) {
            initialTg.exitFullscreen();
          }
          if (initialTg.isVersionAtLeast?.("7.7") && initialTg.enableVerticalSwipes) {
            initialTg.enableVerticalSwipes();
            initialTg.isVerticalSwipesEnabled = true;
          }
          if (initialTg.isVersionAtLeast?.("6.2") && initialTg.disableClosingConfirmation) {
            initialTg.disableClosingConfirmation();
          }
        }
      } catch (error) {
        console.error("[Telegram WebApp Init Error]:", error);
      }
    }

    const ownsTelegramAuth =
      window.location.pathname.startsWith("/tg-app") ||
      window.location.pathname.startsWith("/sign-in") ||
      window.location.pathname.startsWith("/sign-up");

    // These pages authenticate and redirect explicitly, so avoid two competing writers.
    if (ownsTelegramAuth) return;

    const readLaunchPayload = () => {
      return getTelegramLaunchPayload();
    };

    const syncTelegramAccount = async () => {
      if (disposed || syncInFlight || navigationPending) return;

      const { initData, unsafeUser } = readLaunchPayload();
      if (!initData) return;

      const currentTgUserId = getTelegramUserId(initData, unsafeUser);
      let loggedInTgId: string | null = null;
      let wasAuthenticated = false;

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

          wasAuthenticated = Boolean(meData?.authenticated);
          loggedInTgId = getAuthenticatedTelegramId(meData?.user);
        } catch (error) {
          console.error("[Telegram Current Session Check Error]:", error);
        }

        if (wasAuthenticated && currentTgUserId && loggedInTgId === currentTgUserId) {
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

        const accountChanged =
          !wasAuthenticated ||
          !loggedInTgId ||
          !authenticatedTgId ||
          loggedInTgId !== authenticatedTgId;

        if (disposed) return;

        if (accountChanged) {
          navigationPending = true;
          window.location.reload();
          return;
        }

        await refetchUser();
      } catch (error) {
        if (disposed || operationController.signal.aborted) return;
        console.error("[Telegram Account Sync Error]:", error);
        navigationPending = true;
        window.location.replace("/tg-app?sync=retry");
      } finally {
        syncInFlight = false;
      }
    };

    const handleResume = () => {
      void syncTelegramAccount();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncTelegramAccount();
      }
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    try {
      initialTg?.onEvent?.("activated", handleResume);
    } catch (error) {
      console.error("[Telegram Activated Listener Error]:", error);
    }

    void syncTelegramAccount();

    return () => {
      disposed = true;
      operationController.abort();
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      try {
        initialTg?.offEvent?.("activated", handleResume);
      } catch (error) {
        console.error("[Telegram Activated Listener Cleanup Error]:", error);
      }

    };
  }, [pathname, refetchUser]);

  return null;
}
