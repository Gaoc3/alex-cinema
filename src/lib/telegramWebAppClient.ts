let cachedInitData = "";
let cachedUnsafeUser: TelegramWebAppUser | null = null;

const TELEGRAM_CONTEXT_KEY = "isTgWebApp";
export const TELEGRAM_CONTEXT_EVENT = "alex:telegram-context";

function safelyReadSessionFlag(): boolean {
  try {
    return window.sessionStorage.getItem(TELEGRAM_CONTEXT_KEY) === "true";
  } catch {
    return false;
  }
}

export function markTelegramWebAppContext(): void {
  document.documentElement.classList.add("is-telegram-webapp");
  document.body.classList.add("is-telegram-webapp");

  try {
    window.sessionStorage.setItem(TELEGRAM_CONTEXT_KEY, "true");
  } catch {
    // Some embedded browsers disable sessionStorage. The DOM marker is enough
    // for the current document and the live SDK remains the source of truth.
  }

  window.dispatchEvent(new Event(TELEGRAM_CONTEXT_EVENT));
}

export function isTelegramWebAppContext(): boolean {
  const tg = window.Telegram?.WebApp;
  return Boolean(
    tg?.initData
      || tg?.initDataUnsafe?.user
      || safelyReadSessionFlag()
      || new URLSearchParams(window.location.search).has("tgWebApp")
      || new URLSearchParams(window.location.hash.replace(/^#/, "")).has("tgWebAppData"),
  );
}

export function isLiveTelegramWebApp(): boolean {
  const tg = window.Telegram?.WebApp;
  return Boolean(tg?.initData || tg?.initDataUnsafe?.user);
}

export function isLargeTelegramViewport(): boolean {
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const longSide = Math.max(window.innerWidth, window.innerHeight);
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  // A phone rotated to landscape can be wider than 768px while its usable
  // height is still phone-sized. Tablets use the short-side threshold, while
  // desktop clients with a precise pointer can use their wider window.
  return shortSide >= 600 || (!hasCoarsePointer && longSide >= 768);
}

export function configureTelegramWebApp(options?: { immersive?: boolean }): boolean {
  const tg = window.Telegram?.WebApp;
  if (!tg || !isTelegramWebAppContext()) return false;

  markTelegramWebAppContext();

  try {
    tg.ready();
    tg.expand();

    if (tg.isVersionAtLeast?.("6.1")) {
      tg.setHeaderColor?.("#07111f");
      tg.setBackgroundColor?.("#07111f");
    }
    if (tg.isVersionAtLeast?.("7.10")) {
      tg.setBottomBarColor?.("#07111f");
    }

    // Keep vertical gestures inside the application. Re-enabling Telegram's
    // collapse swipe makes the first content scroll capable of dismissing the
    // WebView on mobile clients.
    if (tg.isVersionAtLeast?.("7.7")) {
      tg.disableVerticalSwipes?.();
    }

    const wantsFullscreen = isLargeTelegramViewport();
    if (wantsFullscreen && tg.isVersionAtLeast?.("8.0")) {
      tg.requestFullscreen?.();
    }

    if (options?.immersive && tg.isVersionAtLeast?.("6.2")) {
      tg.enableClosingConfirmation?.();
    } else if (tg.isVersionAtLeast?.("6.2")) {
      tg.disableClosingConfirmation?.();
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

function removeLaunchDataFromUrl(): void {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const hadSearchData = url.searchParams.has("tgWebAppData");
  const hadHashData = hashParams.has("tgWebAppData");
  if (!hadSearchData && !hadHashData) return;

  url.searchParams.delete("tgWebAppData");
  hashParams.delete("tgWebAppData");
  const cleanHash = hashParams.toString();
  const cleanUrl = `${url.pathname}${url.search}${cleanHash ? `#${cleanHash}` : ""}`;
  window.history.replaceState(window.history.state, "", cleanUrl);
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
    removeLaunchDataFromUrl();
  }

  return { initData, unsafeUser };
}
