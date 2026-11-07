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

export async function createSession(
  userId: string,
  previous?: string,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const client = await authDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '24 hours')",
      [digest(token), userId],
    );
    if (previous)
      await client.query("DELETE FROM sessions WHERE token_hash = $1", [
        digest(previous),
      ]);
    await client.query("COMMIT");
    return token;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
export async function readSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = (
    await authDatabase().query<Account & { expires_at: Date }>(
      `SELECT users.id, users.email, users.nama, users.created_at, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = $1 AND expires_at > now()`,
      [digest(token)],
    )
  ).rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    nama: row.nama,
    created_at: new Date(row.created_at).toISOString(),
    exp: Math.floor(new Date(row.expires_at).getTime() / 1000),
  };
}
export async function revokeSession(token: string | undefined): Promise<void> {
  if (token)
    await authDatabase().query("DELETE FROM sessions WHERE token_hash = $1", [
      digest(token),
    ]);
}
