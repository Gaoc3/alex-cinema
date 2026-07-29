import { SignJWT, jwtVerify } from "jose";

export const TELEGRAM_SESSION_COOKIE = "telegram_session";
export const TELEGRAM_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const SESSION_ISSUER = "alex-cinema";
const SESSION_AUDIENCE = "telegram-session";
const TELEGRAM_SUBJECT_PATTERN = /^telegram_[1-9]\d*$/;

function getSessionKey(): Uint8Array {
  const secret = process.env.TELEGRAM_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("TELEGRAM_SESSION_SECRET must be a server-only secret of at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export function getTelegramSessionKey(): Uint8Array {
  return getSessionKey();
}

export async function createTelegramSessionToken(payload: { clerkId: string }): Promise<string> {
  if (!TELEGRAM_SUBJECT_PATTERN.test(payload.clerkId)) {
    throw new Error("Invalid Telegram session subject.");
  }

  return new SignJWT({ provider: "telegram" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(payload.clerkId)
    .setIssuedAt()
    .setExpirationTime(`${TELEGRAM_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionKey());
}

export async function parseTelegramSessionToken(token: string): Promise<{ clerkId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      clockTolerance: 5,
    });

    if (payload.provider !== "telegram" || !payload.sub || !TELEGRAM_SUBJECT_PATTERN.test(payload.sub)) {
      return null;
    }

    return { clerkId: payload.sub };
  } catch {
    return null;
  }
}
