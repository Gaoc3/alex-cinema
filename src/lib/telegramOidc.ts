import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getTelegramSessionKey } from "@/lib/telegramSession";

export const TELEGRAM_OIDC_TRANSACTION_COOKIE = "telegram_oidc_transaction";
export const TELEGRAM_OIDC_TRANSACTION_MAX_AGE_SECONDS = 10 * 60;

const TRANSACTION_ISSUER = "alex-cinema";
const TRANSACTION_AUDIENCE = "telegram-oidc-transaction";

interface TelegramOidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
}

export async function createTelegramOidcTransaction(): Promise<
  TelegramOidcTransaction & { codeChallenge: string; token: string }
> {
  const state = crypto.randomBytes(32).toString("base64url");
  const nonce = crypto.randomBytes(32).toString("base64url");
  const codeVerifier = crypto.randomBytes(48).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const token = await new SignJWT({ state, nonce, codeVerifier })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(TRANSACTION_ISSUER)
    .setAudience(TRANSACTION_AUDIENCE)
    .setSubject("telegram-oidc")
    .setIssuedAt()
    .setExpirationTime(`${TELEGRAM_OIDC_TRANSACTION_MAX_AGE_SECONDS}s`)
    .sign(getTelegramSessionKey());

  return { state, nonce, codeVerifier, codeChallenge, token };
}

export async function parseTelegramOidcTransaction(
  token: string
): Promise<TelegramOidcTransaction | null> {
  try {
    const { payload } = await jwtVerify(token, getTelegramSessionKey(), {
      algorithms: ["HS256"],
      issuer: TRANSACTION_ISSUER,
      audience: TRANSACTION_AUDIENCE,
      subject: "telegram-oidc",
      clockTolerance: 5,
    });

    if (
      typeof payload.state !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.codeVerifier !== "string"
    ) {
      return null;
    }

    return {
      state: payload.state,
      nonce: payload.nonce,
      codeVerifier: payload.codeVerifier,
    };
  } catch {
    return null;
  }
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
