import "server-only";
import { randomBytes } from "node:crypto";
import { type Account, digest } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";

export const SESSION_COOKIE = "lumina_session";
export const SESSION_MAX_AGE = 60 * 60 * 24;

export interface SessionPayload extends Account {
  exp: number;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("base64url");
  const db = authDatabase();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(digest(token), userId, Date.now() + SESSION_MAX_AGE * 1000);
  return token;
}

export function readSession(token: string | undefined): SessionPayload | null {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = authDatabase()
    .prepare(`
    SELECT users.id, users.email, users.nama, users.created_at, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE token_hash = ? AND expires_at > ?
  `)
    .get(digest(token), Date.now()) as
    | (Account & { expires_at: number })
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    nama: row.nama,
    created_at: row.created_at,
    exp: Math.floor(row.expires_at / 1000),
  };
}

export function revokeSession(token: string | undefined): void {
  if (token)
    authDatabase()
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .run(digest(token));
}
