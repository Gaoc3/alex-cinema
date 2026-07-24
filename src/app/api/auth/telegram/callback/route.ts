import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createTelegramSessionToken } from "@/lib/getAuthUser";

const CLIENT_ID = process.env.TELEGRAM_CLIENT_ID || "8814857532";
const CLIENT_SECRET = process.env.TELEGRAM_CLIENT_SECRET || "bCb3i_tAqvc7MHhU4OMs7q1Q2OCH0rYlzhX9b0rI8SYPMwvMn4K6ew";
const REDIRECT_URI = "https://cinax.live/api/auth/telegram/callback";
const BASE_URL = "https://cinax.live";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("[Telegram OIDC Callback Error]:", error);
      return NextResponse.redirect(`${BASE_URL}/sign-in?error=tg_cancelled`);
    }

    // Handle OIDC Code Exchange
    if (code) {
      console.log("[Telegram OIDC Callback] Exchanging code for tokens...");

      const tokenResponse = await fetch("https://oauth.telegram.org/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("[Telegram OIDC Token Exchange Failed]:", errorText);
        return NextResponse.redirect(`${BASE_URL}/sign-in?error=token_failed`);
      }

      const tokenData = await tokenResponse.json();
      const idToken = tokenData.id_token;

      if (idToken) {
        // Decode JWT id_token payload
        const parts = idToken.split(".");
        const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
        const claims = JSON.parse(payloadJson);

        if (!claims.iss || claims.iss !== "https://oauth.telegram.org") {
          console.error("[Telegram OIDC Callback] Invalid issuer:", claims.iss);
          return NextResponse.redirect(`${BASE_URL}/sign-in?error=invalid_token`);
        }

        if (!claims.aud || claims.aud.toString() !== CLIENT_ID) {
          console.error("[Telegram OIDC Callback] Invalid audience:", claims.aud);
          return NextResponse.redirect(`${BASE_URL}/sign-in?error=invalid_token`);
        }

        const now = Math.floor(Date.now() / 1000);
        if (claims.exp && now > claims.exp) {
          console.error("[Telegram OIDC Callback] Expired token");
          return NextResponse.redirect(`${BASE_URL}/sign-in?error=invalid_token`);
        }

        const tgId = claims.id || claims.sub;
        const name = `${claims.given_name || claims.name || ""} ${claims.family_name || ""}`.trim() || claims.preferred_username || `User ${tgId}`;
        const avatarUrl = claims.picture || claims.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgId}`;
        const externalId = `telegram_${tgId}`;

        // Upsert User in PostgreSQL
        const dbUser = await prisma.user.upsert({
          where: { clerkId: externalId },
          update: { name, imageUrl: avatarUrl },
          create: { clerkId: externalId, name, imageUrl: avatarUrl },
        });

        // Set Session Cookie
        const sessionToken = createTelegramSessionToken({
          clerkId: externalId,
          name: dbUser.name,
          imageUrl: dbUser.imageUrl,
        });

        const cookieStore = await cookies();
        cookieStore.set("telegram_session", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
          sameSite: "lax",
        });

        return NextResponse.redirect(`${BASE_URL}/home`);
      }
    }

    return NextResponse.redirect(`${BASE_URL}/sign-in`);
  } catch (error: any) {
    console.error("[Telegram Callback Route Error]:", error);
    return NextResponse.redirect(`${BASE_URL}/sign-in?error=server_error`);
  }
}
