import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  parseTelegramSessionToken,
  TELEGRAM_SESSION_COOKIE,
} from "@/lib/telegramSession";

export { createTelegramSessionToken, parseTelegramSessionToken } from "@/lib/telegramSession";

export interface AuthUserInfo {
  id: string; // Database User CUID
  clerkId: string; // "telegram_12345678" or Clerk User ID
  name: string;
  imageUrl: string | null;
}

export async function getAuthUser(): Promise<AuthUserInfo | null> {
  // 1. Try Telegram Cookie First
  try {
    const cookieStore = await cookies();
    const tgCookie = cookieStore.get(TELEGRAM_SESSION_COOKIE)?.value;
    if (tgCookie) {
      const parsed = await parseTelegramSessionToken(tgCookie);
      if (parsed?.clerkId) {
        const dbUser = await prisma.user.findUnique({
          where: { clerkId: parsed.clerkId },
        });

        if (dbUser) {
          return {
            id: dbUser.id,
            clerkId: dbUser.clerkId,
            name: dbUser.name || "Telegram User",
            imageUrl: dbUser.imageUrl,
          };
        }
      }
    }
  } catch (e) {
    console.error("[getAuthUser] Telegram Cookie Auth Error:", e);
  }

  // 2. Try Clerk Auth
  try {
    const authObj = await auth();
    if (authObj && authObj.userId) {
      let dbUser = await prisma.user.findUnique({
        where: { clerkId: authObj.userId },
      });

      if (!dbUser) {
        const user = await currentUser();
        if (user) {
          const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User";
          dbUser = await prisma.user.upsert({
            where: { clerkId: authObj.userId },
            create: {
              clerkId: authObj.userId,
              name,
              imageUrl: user.imageUrl,
            },
            update: {
              name,
              imageUrl: user.imageUrl,
            },
          });
        }
      }

      if (dbUser) {
        return {
          id: dbUser.id,
          clerkId: dbUser.clerkId,
          name: dbUser.name || "User",
          imageUrl: dbUser.imageUrl,
        };
      }
    }
  } catch (e) {
    console.error("[getAuthUser] Clerk Auth Error:", e);
  }

  return null;
}
