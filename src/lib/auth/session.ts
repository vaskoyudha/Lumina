import "server-only";
import { randomBytes } from "node:crypto";
import { type Account, digest } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";

export const SESSION_COOKIE = "lumina_session";
export const SESSION_MAX_AGE = 60 * 60 * 24;

export interface SessionPayload extends Account {
  exp: number;
}

export interface SessionMeta {
  userAgent?: string | null;
  clientIp?: string | null;
}

export interface AccountSession {
  id: string;
  userAgent: string | null;
  clientIp: string | null;
  signedIn: string;
  lastActive: string;
  expiresAt: string;
  current: boolean;
}

interface SessionRecord {
  token_hash: string;
  user_agent: string | null;
  client_ip: string | null;
  created_at: Date | string;
  last_seen_at: Date | string;
  expires_at: Date | string;
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
  meta: SessionMeta = {},
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const client = await authDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO sessions
        (token_hash, user_id, expires_at, user_agent, client_ip, created_at, last_seen_at)
       VALUES ($1, $2, now() + interval '24 hours', $3, $4, now(), now())`,
      [digest(token), userId, meta.userAgent ?? null, meta.clientIp ?? null],
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
  await authDatabase()
    .query(
      "UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1 AND last_seen_at < now() - interval '5 minutes'",
      [digest(token)],
    )
    .catch(() => {});
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

export async function listSessions(
  userId: string,
  currentToken?: string,
): Promise<AccountSession[]> {
  const currentHash = currentToken ? digest(currentToken) : "";
  const rows = (
    await authDatabase().query<SessionRecord>(
      `SELECT token_hash, user_agent, client_ip, created_at, last_seen_at, expires_at
       FROM sessions
       WHERE user_id = $1 AND expires_at > now()
       ORDER BY last_seen_at DESC
       LIMIT 50`,
      [userId],
    )
  ).rows;
  return rows.map((row) => ({
    id: row.token_hash,
    userAgent: row.user_agent,
    clientIp: row.client_ip,
    signedIn: new Date(row.created_at).toISOString(),
    lastActive: new Date(row.last_seen_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    current: row.token_hash === currentHash,
  }));
}

export async function revokeUserSession(
  userId: string,
  tokenHash: string,
): Promise<boolean> {
  const result = await authDatabase().query(
    "DELETE FROM sessions WHERE token_hash = $1 AND user_id = $2",
    [tokenHash, userId],
  );
  return Boolean(result.rowCount);
}

export async function revokeOtherSessions(
  userId: string,
  currentToken?: string,
): Promise<number> {
  const currentHash = currentToken ? digest(currentToken) : null;
  const result = currentHash
    ? await authDatabase().query(
        "DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2",
        [userId, currentHash],
      )
    : await authDatabase().query("DELETE FROM sessions WHERE user_id = $1", [
        userId,
      ]);
  return result.rowCount ?? 0;
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await authDatabase().query(
    "DELETE FROM sessions WHERE user_id = $1",
    [userId],
  );
  return result.rowCount ?? 0;
}
