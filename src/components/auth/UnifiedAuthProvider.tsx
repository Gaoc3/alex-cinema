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
  const [isTgLoaded, setIsTgLoaded] = useState(false);
  const fetchRequestIdRef = useRef(0);

  const fetchTgUser = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;

    try {
      const res = await fetchWithTimeout("/api/auth/me", { cache: "no-store" }, 8_000);
      if (!res.ok) throw new Error("Failed to load Telegram session.");
      const data = await res.json();

      if (requestId !== fetchRequestIdRef.current) return;

      if (data?.authenticated && data?.user?.authProvider === "telegram") {
        setTgUser(data.user);
      } else {
        setTgUser(null);
      }
    } catch {
      if (requestId !== fetchRequestIdRef.current) return;
      setTgUser(null);
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsTgLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTgUser();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTgUser]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}

    try {
      if (isClerkSignedIn) {
        await clerkSignOut();
      }
    } catch {}

    setTgUser(null);
    window.location.href = "/";
  }, [isClerkSignedIn, clerkSignOut]);

  // Derived state: User is signed in if Telegram cookie is valid OR Clerk is signed in
  const activeUser: UnifiedUser | null = tgUser
    ? tgUser
    : isClerkSignedIn && clerkUser
    ? {
        id: clerkUser.id,
        clerkId: clerkUser.id,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
        imageUrl: clerkUser.imageUrl,
      }
    : null;

  const isSignedIn = Boolean(activeUser);
  const isLoaded = isTgLoaded && isClerkLoaded;
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
