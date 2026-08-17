import React from 'react';

export interface TelegramWebAppLaunchPayload {
  initData: string;
  unsafeUser: TelegramWebAppUser | null;
}

export const TELEGRAM_CONTEXT_EVENT = "alex:tg-context-ready";
const STORAGE_KEY = "alex-tg-webapp-context";
let cachedInitData = "";
let cachedUnsafeUser: TelegramWebAppUser | null = null;

export function isTelegramWebAppContext(): boolean {
  if (typeof window === "undefined") return false;
  return (
    Boolean(window.Telegram?.WebApp?.initData) ||
    window.location.hash.includes("tgWebAppData") ||
    window.location.search.includes("tgWebAppData") ||
    window.location.search.includes("tgWebApp=true") ||
    sessionStorage.getItem(STORAGE_KEY) === "true"
  );
}

export function markTelegramWebAppContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, "true");
}

export function isLiveTelegramWebApp(): boolean {
  const tg = window.Telegram?.WebApp;
  return Boolean(tg?.initData || tg?.initDataUnsafe?.user);
}

export function configureTelegramWebApp(options?: { immersive?: boolean }): boolean {
  const tg = window.Telegram?.WebApp;
  if (!tg || !isTelegramWebAppContext()) return false;

  try {
    if (!sessionStorage.getItem("alex-tg-ready-fired")) {
      tg.ready?.();
      tg.expand?.();
      sessionStorage.setItem("alex-tg-ready-fired", "true");
    }

    // Auto-request fullscreen on Telegram Desktop / macOS / Web / Tablet
    const platform = (((tg as any).platform as string) || "").toLowerCase();
    const isDesktopOrWeb =
      platform === "tdesktop" ||
      platform === "macos" ||
      platform === "weba" ||
      platform === "webk" ||
      platform === "web" ||
      platform === "tablet";

    if (isDesktopOrWeb || options?.immersive) {
      try {
        if (typeof (tg as any).requestFullscreen === "function") {
          (tg as any).requestFullscreen();
        }
      } catch (e) {
        console.warn("[Telegram Fullscreen Error]:", e);
      }
    }

    if (tg.isVersionAtLeast?.("6.1")) {
      tg.setHeaderColor?.("#07111f");
      tg.setBackgroundColor?.("#07111f");
    }

    if (tg.isVersionAtLeast?.("7.10")) {
      tg.setBottomBarColor?.("#07111f");
    }

    // Prevent pull down gesture from closing or crashing WebApp during mobile scroll
    if (tg.isVersionAtLeast?.("7.7")) {
      tg.disableVerticalSwipes?.();
    }
  } catch (error) {
    console.error("[Telegram WebApp Configuration Error]:", error);
  }

  return true;
}

function readLaunchDataFromUrl(): string {
  const hashData = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("tgWebAppData");
  if (hashData) return hashData;

  return new URLSearchParams(window.location.search).get("tgWebAppData") || "";
}

export function getTelegramLaunchPayload(): {
  initData: string;
  unsafeUser: TelegramWebAppUser | null;
} {
  const tg = window.Telegram?.WebApp;
  const liveInitData = tg?.initData || "";
  const urlInitData = liveInitData ? "" : readLaunchDataFromUrl();
  const initData = liveInitData || urlInitData || cachedInitData;
  const unsafeUser = tg?.initDataUnsafe?.user || cachedUnsafeUser;

  if (initData) {
    cachedInitData = initData;
    cachedUnsafeUser = unsafeUser;
    markTelegramWebAppContext();
  }

  return { initData, unsafeUser };
}

export function safeOpenExternalLink(url: string, e?: React.MouseEvent): void {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (typeof window === "undefined" || !url) return;
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export interface TelegramSafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function useTelegramSafeArea() {
  const [safeArea, setSafeArea] = React.useState<TelegramSafeArea>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [contentSafeArea, setContentSafeArea] = React.useState<TelegramSafeArea>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isDesktopOrWeb, setIsDesktopOrWeb] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    const platform = ((tg.platform as string) || "").toLowerCase();
    const desktopOrWeb =
      platform === "tdesktop" ||
      platform === "macos" ||
      platform === "weba" ||
      platform === "webk" ||
      platform === "web" ||
      platform === "tablet";

    setIsDesktopOrWeb(desktopOrWeb);

    const updateInsets = () => {
      if (tg.safeAreaInset) {
        setSafeArea({
          top: tg.safeAreaInset.top || 0,
          bottom: tg.safeAreaInset.bottom || 0,
          left: tg.safeAreaInset.left || 0,
          right: tg.safeAreaInset.right || 0,
        });
      }
      if (tg.contentSafeAreaInset) {
        setContentSafeArea({
          top: tg.contentSafeAreaInset.top || 0,
          bottom: tg.contentSafeAreaInset.bottom || 0,
          left: tg.contentSafeAreaInset.left || 0,
          right: tg.contentSafeAreaInset.right || 0,
        });
      }
      if (typeof tg.isFullscreen === "boolean") {
        setIsFullscreen(tg.isFullscreen);
      }
    };

    updateInsets();

    tg.onEvent?.("safeAreaChanged", updateInsets);
    tg.onEvent?.("contentSafeAreaChanged", updateInsets);
    tg.onEvent?.("fullscreenChanged", updateInsets);

    return () => {
      tg.offEvent?.("safeAreaChanged", updateInsets);
      tg.offEvent?.("contentSafeAreaChanged", updateInsets);
      tg.offEvent?.("fullscreenChanged", updateInsets);
    };
  }, []);

  return { safeArea, contentSafeArea, isFullscreen, isDesktopOrWeb };
}

