import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface VerifiedTelegramUser {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  photo_url: string;
}

const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_JWKS = createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json")
);
const MAX_INIT_DATA_LENGTH = 16_384;
const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 60 * 60;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export function getRequiredTelegramEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}

function normalizeTelegramId(value: unknown): string | null {
  const normalized = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  return /^[1-9]\d*$/.test(normalized) ? normalized : null;
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeTelegramUser(value: unknown): VerifiedTelegramUser | null {
  if (!value || typeof value !== "object") return null;

  const user = value as Record<string, unknown>;
  const id = normalizeTelegramId(user.id ?? user.sub);
  if (!id) return null;

  return {
    id,
    first_name: optionalString(user.first_name ?? user.given_name ?? user.name),
    last_name: optionalString(user.last_name ?? user.family_name),
    username: optionalString(user.username ?? user.preferred_username),
    photo_url: optionalString(user.photo_url ?? user.picture),
  };
}

export function verifyTelegramWebAppData(initData: string): VerifiedTelegramUser | null {
  if (!initData || initData.length > MAX_INIT_DATA_LENGTH) return null;

  try {
    const botToken = getRequiredTelegramEnv("TELEGRAM_BOT_TOKEN");
    const urlParams = new URLSearchParams(initData);
    const providedHash = urlParams.get("hash");
    const authDateValue = urlParams.get("auth_date");

    if (!providedHash || !/^[a-f0-9]{64}$/i.test(providedHash) || !authDateValue) return null;

    const authDate = Number(authDateValue);
    const now = Math.floor(Date.now() / 1000);
    const configuredMaxAge = Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS);
    const maxAge = Number.isFinite(configuredMaxAge) && configuredMaxAge > 0
      ? configuredMaxAge
      : DEFAULT_INIT_DATA_MAX_AGE_SECONDS;

    if (!Number.isInteger(authDate)) return null;
    if (authDate > now + MAX_CLOCK_SKEW_SECONDS || now - authDate > maxAge) return null;

    urlParams.delete("hash");
    const dataCheckString = Array.from(urlParams.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest();
    const receivedHash = Buffer.from(providedHash, "hex");

    if (receivedHash.length !== calculatedHash.length) return null;
    if (!crypto.timingSafeEqual(receivedHash, calculatedHash)) return null;

    const userJson = urlParams.get("user");
    return userJson ? normalizeTelegramUser(JSON.parse(userJson)) : null;
  } catch {
    return null;
  }
}

export async function verifyTelegramOidcIdToken(
  idToken: string,
  expectedNonce: string
): Promise<VerifiedTelegramUser> {
  const clientId = getRequiredTelegramEnv("TELEGRAM_CLIENT_ID");
  const { payload } = await jwtVerify(idToken, TELEGRAM_JWKS, {
    algorithms: ["RS256", "ES256", "EdDSA", "ES256K"],
    issuer: TELEGRAM_OIDC_ISSUER,
    audience: clientId,
    clockTolerance: 5,
  });

  validateOidcClaims(payload, expectedNonce);

  const user = normalizeTelegramUser(payload);
  if (!user) throw new Error("Telegram OIDC token has an invalid user identity.");
  return user;
}

function validateOidcClaims(payload: JWTPayload, expectedNonce: string): void {
  if (!payload.sub || typeof payload.iat !== "number" || typeof payload.exp !== "number") {
    throw new Error("Telegram OIDC token is missing required claims.");
  }

  if (payload.nonce !== expectedNonce) {
    throw new Error("Telegram OIDC nonce mismatch.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iat > now + MAX_CLOCK_SKEW_SECONDS) {
    throw new Error("Telegram OIDC token was issued in the future.");
  }
}
