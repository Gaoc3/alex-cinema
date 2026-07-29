import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredTelegramEnv, verifyTelegramOidcIdToken } from "@/lib/telegramAuth";
import {
  createTelegramSessionToken,
  TELEGRAM_SESSION_COOKIE,
  TELEGRAM_SESSION_MAX_AGE_SECONDS,
} from "@/lib/telegramSession";
import {
  parseTelegramOidcTransaction,
  safeEqual,
  TELEGRAM_OIDC_TRANSACTION_COOKIE,
} from "@/lib/telegramOidc";

export const dynamic = "force-dynamic";

function getAppOrigin(request: Request): string {
  try {
    return new URL(process.env.APP_ORIGIN || request.url).origin;
  } catch {
    return new URL(request.url).origin;
  }
}

function clearTransactionCookie(response: NextResponse): void {
  response.cookies.set(TELEGRAM_OIDC_TRANSACTION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/telegram",
    expires: new Date(0),
  });
}

function redirectWithError(request: NextRequest, code: string): NextResponse {
  const url = new URL("/sign-in", getAppOrigin(request));
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  clearTransactionCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const state = request.nextUrl.searchParams.get("state") || "";
    const providerError = request.nextUrl.searchParams.get("error");
    const transactionToken = request.cookies.get(TELEGRAM_OIDC_TRANSACTION_COOKIE)?.value;
    const transaction = transactionToken
      ? await parseTelegramOidcTransaction(transactionToken)
      : null;

    if (!transaction || !state || !safeEqual(state, transaction.state)) {
      return redirectWithError(request, "tg_invalid_state");
    }

    if (providerError) {
      return redirectWithError(request, "tg_cancelled");
    }

    const code = request.nextUrl.searchParams.get("code");
    if (!code) return redirectWithError(request, "tg_missing_code");

    const clientId = getRequiredTelegramEnv("TELEGRAM_CLIENT_ID");
    const clientSecret = getRequiredTelegramEnv("TELEGRAM_CLIENT_SECRET");
    const redirectUri = `${getAppOrigin(request)}/api/auth/telegram/callback`;
    const basicCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch("https://oauth.telegram.org/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicCredentials}`,
      },
      cache: "no-store",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: transaction.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      return redirectWithError(request, "tg_token_exchange_failed");
    }

    const tokenData = (await tokenResponse.json()) as { id_token?: unknown };
    if (typeof tokenData.id_token !== "string") {
      return redirectWithError(request, "tg_missing_id_token");
    }

    const telegramUser = await verifyTelegramOidcIdToken(tokenData.id_token, transaction.nonce);
    const clerkId = `telegram_${telegramUser.id}`;
    const name = `${telegramUser.first_name} ${telegramUser.last_name}`.trim()
      || telegramUser.username
      || `User ${telegramUser.id}`;
    const imageUrl = telegramUser.photo_url
      || `https://api.dicebear.com/7.x/bottts/svg?seed=${telegramUser.id}`;

    await prisma.user.upsert({
      where: { clerkId },
      update: { name, imageUrl },
      create: { clerkId, name, imageUrl },
    });

    const sessionToken = await createTelegramSessionToken({ clerkId });
    const response = NextResponse.redirect(new URL("/home", getAppOrigin(request)));
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(TELEGRAM_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TELEGRAM_SESSION_MAX_AGE_SECONDS,
    });
    clearTransactionCookie(response);
    return response;
  } catch (error) {
    console.error("[Telegram OIDC Callback Error]:", error);
    return redirectWithError(request, "tg_server_error");
  }
}
