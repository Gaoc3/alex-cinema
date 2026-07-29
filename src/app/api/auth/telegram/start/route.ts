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

export async function GET(request: Request) {
  try {
    const clientId = getRequiredTelegramEnv("TELEGRAM_CLIENT_ID");
    const appOrigin = getAppOrigin(request);
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
