import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

const SECRET = process.env.NEXT_PUBLIC_CRYPTO_SECRET || "vA$c1n_S3cr3t_K3y_!2024";

export interface AuthUserInfo {
  id: string; // Database User CUID
  clerkId: string; // "telegram_12345678" or Clerk User ID
  name: string;
  imageUrl: string | null;
}

export function createTelegramSessionToken(payload: { clerkId: string; name: string; imageUrl?: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }); // 30 days
  const hmac = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  return `${Buffer.from(data).toString("base64")}.${hmac}`;
}

export function parseTelegramSessionToken(token: string): { clerkId: string; name: string; imageUrl?: string } | null {
  try {
    const [base64Data, hmac] = token.split(".");
    if (!base64Data || !hmac) return null;

    const data = Buffer.from(base64Data, "base64").toString("utf-8");
    const expectedHmac = crypto.createHmac("sha256", SECRET).update(data).digest("hex");

    if (hmac !== expectedHmac) return null;

    const parsed = JSON.parse(data);
    if (parsed.exp && Date.now() > parsed.exp) return null;

    return parsed;
  } catch (e) {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUserInfo | null> {
  // 1. Try Telegram Cookie First
  try {
    const cookieStore = await cookies();
    const tgCookie = cookieStore.get("telegram_session")?.value;
    if (tgCookie) {
      const parsed = parseTelegramSessionToken(tgCookie);
      if (parsed?.clerkId) {
        let dbUser = await prisma.user.findUnique({
          where: { clerkId: parsed.clerkId },
        });

        // Auto-create in DB if user does not exist yet
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              clerkId: parsed.clerkId,
              name: parsed.name || "Telegram User",
              imageUrl: parsed.imageUrl || null,
            },
          });
        }

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
          dbUser = await prisma.user.create({
            data: {
              clerkId: authObj.userId,
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
