import { NextResponse } from "next/server";
import { getRequiredTelegramEnv } from "@/lib/telegramAuth";
import {
  createTelegramOidcTransaction,
  TELEGRAM_OIDC_TRANSACTION_COOKIE,
  TELEGRAM_OIDC_TRANSACTION_MAX_AGE_SECONDS,
} from "@/lib/telegramOidc";

export const dynamic = "force-dynamic";

function getAppOrigin(request: Request): string {
  try {
    return new URL(process.env.APP_ORIGIN || request.url).origin;
  } catch {
    return new URL(request.url).origin;
  }
}

function getRequestHost(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")
    ?.split(",", 1)[0]
    .trim();

  return (forwardedHost || request.headers.get("host") || new URL(request.url).host)
    .toLowerCase();
}

export async function GET(request: Request) {
  try {
    const appOrigin = getAppOrigin(request);
    const canonicalHost = new URL(appOrigin).host.toLowerCase();

    // A host-only transaction cookie created on www.cinax.live is not sent when
    // Telegram redirects back to the canonical cinax.live callback. Canonicalize
    // before creating the OIDC transaction so the cookie and callback always use
    // the same host, including a user's very first authorization attempt.
    if (getRequestHost(request) !== canonicalHost) {
      const response = NextResponse.redirect(
        new URL("/api/auth/telegram/start", appOrigin),
        307,
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    const clientId = getRequiredTelegramEnv("TELEGRAM_CLIENT_ID");
    const redirectUri = `${appOrigin}/api/auth/telegram/callback`;
    const transaction = await createTelegramOidcTransaction();

    const authorizationUrl = new URL("https://oauth.telegram.org/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile",
      state: transaction.state,
      nonce: transaction.nonce,
      code_challenge: transaction.codeChallenge,
      code_challenge_method: "S256",
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(TELEGRAM_OIDC_TRANSACTION_COOKIE, transaction.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/telegram",
      maxAge: TELEGRAM_OIDC_TRANSACTION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[Telegram OIDC Start Error]:", error);
    const signInUrl = new URL("/sign-in", getAppOrigin(request));
    signInUrl.searchParams.set("error", "tg_oidc_unavailable");
    return NextResponse.redirect(signInUrl);
  }
}
