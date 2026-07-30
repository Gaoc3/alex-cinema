"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

interface UnifiedUser {
  id: string;
  clerkId: string;
  name: string;
  imageUrl: string | null;
  authProvider?: "telegram" | "clerk";
  telegramId?: string | null;
}

interface UnifiedAuthContextType {
  user: UnifiedUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  isTelegramUser: boolean;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

type TelegramSessionState = "loading" | "authenticated" | "anonymous" | "error";

const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  user: null,
  isSignedIn: false,
  isLoaded: false,
  isTelegramUser: false,
  signOut: async () => {},
  refetchUser: async () => {},
});

export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [tgUser, setTgUser] = useState<UnifiedUser | null>(null);
  const [tgSessionState, setTgSessionState] = useState<TelegramSessionState>("loading");
  const [tgRetryVersion, setTgRetryVersion] = useState(0);
  const fetchRequestIdRef = useRef(0);
  const retryCountRef = useRef(0);

  const fetchTgUser = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;

    try {
      const res = await fetchWithTimeout("/api/auth/me", { cache: "no-store" }, 8_000);
      if (!res.ok) throw new Error("Failed to load Telegram session.");
      const data = await res.json();

      if (requestId !== fetchRequestIdRef.current) return;

      if (data?.authenticated && data?.user?.authProvider === "telegram") {
        setTgUser(data.user);
        setTgSessionState("authenticated");
      } else {
        setTgUser(null);
        setTgSessionState("anonymous");
      }
      retryCountRef.current = 0;
    } catch {
      if (requestId !== fetchRequestIdRef.current) return;
      // Keep the last confirmed Telegram identity and never fall back to a
      // different provider while the server-side identity is unknown.
      setTgSessionState("error");
      retryCountRef.current += 1;
      setTgRetryVersion((version) => version + 1);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTgUser();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTgUser]);

  useEffect(() => {
    if (tgSessionState !== "error") return;

    const retryDelay = Math.min(30_000, 1_000 * (2 ** Math.min(retryCountRef.current - 1, 5)));
    const retryId = window.setTimeout(() => {
      void fetchTgUser();
    }, retryDelay);

    return () => window.clearTimeout(retryId);
  }, [fetchTgUser, tgRetryVersion, tgSessionState]);

  const signOut = useCallback(async () => {
    const logoutResponse = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!logoutResponse.ok) {
      throw new Error("تعذر تسجيل الخروج. حاول مجددًا.");
    }

    if (isClerkSignedIn) {
      try {
        await clerkSignOut();
      } catch {
        await fetchTgUser();
        throw new Error("تعذر إنهاء جلسة الحساب. حاول مجددًا.");
      }
    }

    setTgUser(null);
    setTgSessionState("anonymous");
    window.location.href = "/";
  }, [isClerkSignedIn, clerkSignOut, fetchTgUser]);

  // Clerk is only eligible after the server has confirmed that no Telegram
  // session is active. This keeps client and API identity selection aligned.
  const activeUser: UnifiedUser | null = tgUser
    ? tgUser
    : tgSessionState === "anonymous" && isClerkSignedIn && clerkUser
    ? {
        id: clerkUser.id,
        clerkId: clerkUser.id,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
        imageUrl: clerkUser.imageUrl,
      }
    : null;

  const isSignedIn = Boolean(activeUser);
  const isLoaded = (tgSessionState === "authenticated" || tgSessionState === "anonymous") && isClerkLoaded;
  const isTelegramUser = Boolean(tgUser);

  return (
    <UnifiedAuthContext.Provider
      value={{
        user: activeUser,
        isSignedIn,
        isLoaded,
        isTelegramUser,
        signOut,
        refetchUser: fetchTgUser,
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
}

export function useUnifiedAuth() {
  return useContext(UnifiedAuthContext);
}
