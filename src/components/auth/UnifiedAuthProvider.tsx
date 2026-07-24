"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

interface UnifiedUser {
  id: string;
  clerkId: string;
  name: string;
  imageUrl: string | null;
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

  const fetchTgUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data?.authenticated && data?.user) {
        setTgUser(data.user);
      } else {
        setTgUser(null);
      }
    } catch (e) {
      setTgUser(null);
    } finally {
      setIsTgLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTgUser();
  }, [fetchTgUser]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}

    try {
      if (isClerkSignedIn) {
        await clerkSignOut();
      }
    } catch (e) {}

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
