import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTelegramWebAppData } from "@/lib/telegramAuth";
import {
  createTelegramSessionToken,
  parseTelegramSessionToken,
  TELEGRAM_SESSION_COOKIE,
  TELEGRAM_SESSION_MAX_AGE_SECONDS,
} from "@/lib/telegramSession";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function clearTelegramSessionCookie(response: NextResponse): void {
  response.cookies.set(TELEGRAM_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

function errorResponse(message: string, status: number, clearSession = false): NextResponse {
  const response = NextResponse.json({ success: false, error: message }, {
    status,
    headers: noStoreHeaders,
  });
  if (clearSession) clearTelegramSessionCookie(response);
  return response;
}

export async function POST(request: NextRequest) {
  let verifiedAccountChanged = false;

  try {
    const expectedOrigin = new URL(process.env.APP_ORIGIN || request.url).origin;
    const requestOrigin = request.headers.get("origin") || (request.headers.get("referer") ? new URL(request.headers.get("referer")!).origin : "");
    if (requestOrigin && requestOrigin !== expectedOrigin && requestOrigin !== request.nextUrl.origin && !requestOrigin.includes("cinax.live") && !requestOrigin.includes("127.0.0.1") && !requestOrigin.includes("localhost")) {
      return errorResponse("مصدر طلب تسجيل الدخول غير مسموح.", 403);
    }

    const contentType = request.headers.get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return errorResponse("نوع محتوى طلب تسجيل الدخول غير مدعوم.", 415);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 20_000) {
      return errorResponse("بيانات تسجيل الدخول أكبر من الحد المسموح.", 413);
    }

    const rawBody = await request.text();
    if (rawBody.length > 20_000) {
      return errorResponse("بيانات تسجيل الدخول أكبر من الحد المسموح.", 413);
    }

    let body: { initData?: unknown };
    try {
      body = JSON.parse(rawBody) as { initData?: unknown };
    } catch {
      return errorResponse("صيغة طلب تسجيل الدخول غير صالحة.", 400);
    }

    if (typeof body.initData !== "string") {
      return errorResponse("بيانات تسجيل الدخول عبر تليجرام غير صالحة.", 400);
    }

    const telegramUser = verifyTelegramWebAppData(body.initData);
    if (!telegramUser) {
      return errorResponse("تعذر التحقق من جلسة تليجرام الحالية. أعد فتح التطبيق من البوت.", 401);
    }

    const clerkId = `telegram_${telegramUser.id}`;
    const currentSessionToken = request.cookies.get(TELEGRAM_SESSION_COOKIE)?.value;
    if (currentSessionToken) {
      const currentSession = await parseTelegramSessionToken(currentSessionToken);
      verifiedAccountChanged = Boolean(
        currentSession?.clerkId && currentSession.clerkId !== clerkId,
      );
    }

    const name = `${telegramUser.first_name} ${telegramUser.last_name}`.trim()
      || telegramUser.username
      || `User ${telegramUser.id}`;
    const imageUrl = telegramUser.photo_url
      || `https://api.dicebear.com/7.x/bottts/svg?seed=${telegramUser.id}`;

    const dbUser = await prisma.user.upsert({
      where: { clerkId },
      update: { name, imageUrl },
      create: { clerkId, name, imageUrl },
    });

    const sessionToken = await createTelegramSessionToken({ clerkId });
    const response = NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        name: dbUser.name,
        imageUrl: dbUser.imageUrl,
        authProvider: "telegram",
        telegramId: telegramUser.id,
      },
    }, { headers: noStoreHeaders });

    response.cookies.set(TELEGRAM_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TELEGRAM_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[Telegram Mini App Auth Error]:", error);
    return errorResponse(
      "حدث خطأ أثناء معالجة تسجيل الدخول عبر تليجرام.",
      500,
      verifiedAccountChanged,
    );
  }
}
