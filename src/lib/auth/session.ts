import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Demo session — signed cookie, no server-side storage.
 *
 * The payload carries only a name, an email, and an expiry. Nothing about the
 * user's activity leaves their device, so a stolen cookie leaks a display name
 * and nothing else. This is a facade for the judged demo, not real auth:
 * there is no password hash, no revocation list, and no database.
 *
 * Server-only. Never import from a client component.
 */

export const SESSION_COOKIE = "lumina_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;

export interface SessionPayload {
  email: string;
  nama: string;
  /** Unix seconds. */
  exp: number;
}

function secret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET wajib diisi di production (minimal 16 karakter). " +
        "Jangan memakai fallback dev untuk deployment.",
    );
  }
  // Deterministic dev fallback so a cookie survives `next dev` restarts.
  return "lumina-dev-only-secret-do-not-ship";
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function signPayload(payload: SessionPayload): string {
  const body = toBase64Url(JSON.stringify(payload));
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyPayload(
  token: string | undefined | null,
): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = createHmac("sha256", secret())
    .update(body)
    .digest("base64url");
  const given = Buffer.from(mac);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return null;
  if (!timingSafeEqual(given, wanted)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(body)) as SessionPayload;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.nama !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function newPayload(email: string, nama: string): SessionPayload {
  return {
    email,
    nama,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
