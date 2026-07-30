let cachedInitData = "";
let cachedUnsafeUser: TelegramWebAppUser | null = null;

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
    removeLaunchDataFromUrl();
  }

  return { initData, unsafeUser };
}
