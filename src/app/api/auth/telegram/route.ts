import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createTelegramSessionToken } from "@/lib/getAuthUser";
import crypto from "node:crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8814857532:AAGE_ATYqwGOXbBSD-g6GHcvBCeSlxKZg1I";
const CLIENT_SECRET = process.env.TELEGRAM_CLIENT_SECRET || "bCb3i_tAqvc7MHhU4OMs7q1Q2OCH0rYlzhX9b0rI8SYPMwvMn4K6ew";
const CLIENT_ID = "8814857532";

/**
 * 1. Verify Telegram OIDC id_token (JWT)
 * (https://core.telegram.org/bots/telegram-login#5-validating-id-tokens)
 */
async function verifyTelegramIdToken(idToken: string): Promise<{ isValid: boolean; user: any }> {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return { isValid: false, user: null };

    // 1. Fetch Telegram JWKS for signature verification
    const jwksRes = await fetch("https://oauth.telegram.org/jwks");
    const jwks = await jwksRes.json();

    const header = JSON.parse(Buffer.from(parts[0].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"));
    const jwk = jwks.keys.find((k: any) => k.kid === header.kid);
    if (!jwk) {
      console.error("[TELEGRAM OIDC] JWK not found for kid:", header.kid);
      return { isValid: false, user: null };
    }

    // 2. Verify Signature
    const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const verify = crypto.createVerify("SHA256");
    verify.update(parts[0] + "." + parts[1]);
    const signature = Buffer.from(parts[2].replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (!verify.verify(key, signature)) {
      console.error("[TELEGRAM OIDC] Invalid signature");
      return { isValid: false, user: null };
    }

    const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const claims = JSON.parse(payloadJson);

    // Verify mandatory claims according to specification
    if (!claims.iss || claims.iss !== "https://oauth.telegram.org") {
      console.error("[TELEGRAM OIDC] Invalid issuer:", claims.iss);
      return { isValid: false, user: null };
    }

    if (!claims.aud || claims.aud.toString() !== CLIENT_ID) {
      console.error("[TELEGRAM OIDC] Invalid audience:", claims.aud);
      return { isValid: false, user: null };
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && now > claims.exp) {
      console.error("[TELEGRAM OIDC] Expired token:", claims.exp);
      return { isValid: false, user: null };
    }

    const user = {
      id: claims.id || claims.sub,
      first_name: claims.given_name || claims.name || "",
      last_name: claims.family_name || "",
      username: claims.preferred_username || "",
      photo_url: claims.picture || claims.photo_url || "",
    };

    return { isValid: true, user };
  } catch (e) {
    console.error("[TELEGRAM OIDC] ID Token validation exception:", e);
    return { isValid: false, user: null };
  }
}



/**
 * 3. Verify Telegram WebApp initData payload
 * (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
 */
function verifyTelegramWebAppData(initData: string, botToken: string): { isValid: boolean; user: any } {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return { isValid: false, user: null };

    urlParams.delete("hash");

    const params: string[] = [];
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`);
    }
    params.sort();
    const dataCheckString = params.join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash !== hash) {
      return { isValid: false, user: null };
    }

    let user: any = null;
    const userJson = urlParams.get("user");
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch (e) {}
    }

    return { isValid: true, user };
  } catch (e) {
    return { isValid: false, user: null };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_token, initData, telegramData } = body;

    let tgUser: any = null;

    // A. OIDC id_token authentication
    if (typeof id_token === "string" && id_token.length > 0) {
      const { isValid, user } = await verifyTelegramIdToken(id_token);
      if (isValid && user) {
        tgUser = user;
      }
    }

    // B. WebApp initData authentication
    if (!tgUser && typeof initData === "string" && initData.length > 0) {
      const { isValid, user } = verifyTelegramWebAppData(initData, BOT_TOKEN);
      if (isValid && user) {
        tgUser = user;
      }
    }

    // C. Additional Telegram id_token in telegramData
    if (!tgUser && telegramData && typeof telegramData === "object") {
      if (telegramData.id_token) {
        const { isValid, user } = await verifyTelegramIdToken(telegramData.id_token);
        if (isValid && user) {
          tgUser = user;
        }
      }
    }

    if (!tgUser || !tgUser.id) {
      return NextResponse.json({ error: "بيانات تسجيل الدخول عبر تليجرام غير صالحة." }, { status: 400 });
    }

    const externalId = `telegram_${tgUser.id}`;
    const name = `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim() || tgUser.username || `User ${tgUser.id}`;
    const avatarUrl = tgUser.photo_url || tgUser.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgUser.id}`;

    // Upsert User in PostgreSQL Database (Prisma)
    const dbUser = await prisma.user.upsert({
      where: { clerkId: externalId },
      update: {
        name: name,
        imageUrl: avatarUrl,
      },
      create: {
        clerkId: externalId,
        name: name,
        imageUrl: avatarUrl,
      },
    });

    // Issue Secure Session Cookie
    const sessionToken = createTelegramSessionToken({
      clerkId: externalId,
      name: name,
      imageUrl: avatarUrl,
    });

    const cookieStore = await cookies();
    cookieStore.set("telegram_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        name: dbUser.name,
        imageUrl: dbUser.imageUrl,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء معالجة تسجيل الدخول." },
      { status: 500 }
    );
  }
}
