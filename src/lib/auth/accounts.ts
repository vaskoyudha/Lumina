import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { authDatabase } from "@/lib/auth/database";
import { checkPassword, hashPassword } from "@/lib/auth/password";

export interface Account {
  id: string;
  email: string;
  nama: string;
  created_at: string;
}

interface AccountRecord extends Account {
  password_hash: string | null;
  google_sub: string | null;
}

export class AuthError extends Error {}

export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Shared by all workers using the same database; no plaintext emails in keys. */
export function consumeAttempt(key: string, limit = 10): void {
  const db = authDatabase();
  const now = Date.now();
  db.prepare("DELETE FROM auth_attempts WHERE expires_at <= ?").run(now);
  const result = db
    .prepare(`
    INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1
    RETURNING count
  `)
    .get(digest(key), now + 15 * 60 * 1000) as { count: number };
  if (result.count > limit)
    throw new AuthError("Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export async function registerAccount(input: {
  nama: string;
  email: string;
  password: string;
  consent: boolean;
}): Promise<Account> {
  const parsed = credentials
    .extend({
      nama: z.string().trim().min(1).max(80),
      password: z.string().min(8).max(128),
      consent: z.literal(true),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new AuthError(
      "Isi nama (maks. 80 karakter), email yang valid, password 8–128 karakter, dan persetujuan.",
    );
  const { nama, email, password } = parsed.data;
  consumeAttempt(`register:${email}`, 5);
  const passwordHash = await hashPassword(password);
  const account = {
    id: randomUUID(),
    nama,
    email,
    created_at: new Date().toISOString(),
  };
  const result = authDatabase()
    .prepare(`
    INSERT INTO users (id, nama, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING
  `)
    .run(account.id, nama, email, passwordHash, account.created_at);
  if (!result.changes)
    throw new AuthError(
      "Email tidak dapat didaftarkan. Jika sudah punya akun, silakan masuk dengan metode sebelumnya.",
    );
  return account;
}

export async function authenticatePassword(
  email: string,
  password: string,
): Promise<Account> {
  const parsed = credentials.safeParse({ email, password });
  if (!parsed.success) throw new AuthError("Email atau password salah.");
  consumeAttempt(`login:${parsed.data.email}`);
  const account = authDatabase()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(parsed.data.email) as AccountRecord | undefined;
  const valid = await checkPassword(
    parsed.data.password,
    account?.password_hash,
  );
  if (!account || !valid)
    throw new AuthError(
      "Email atau password salah. Jika mendaftar lewat Google, gunakan tombol Google.",
    );
  authDatabase()
    .prepare("DELETE FROM auth_attempts WHERE key = ?")
    .run(digest(`login:${parsed.data.email}`));
  return {
    id: account.id,
    nama: account.nama,
    email: account.email,
    created_at: account.created_at,
  };
}

/** Only called with a Google ID token verified by google-auth-library. */
export function googleAccount(
  sub: string,
  email: string,
  nama: string,
): Account {
  const db = authDatabase();
  const existing = db
    .prepare(
      "SELECT id, email, nama, created_at FROM users WHERE google_sub = ?",
    )
    .get(sub) as Account | undefined;
  if (existing) return existing;
  const account = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    nama: nama.slice(0, 80),
    created_at: new Date().toISOString(),
  };
  const result = db
    .prepare(`
    INSERT INTO users (id, email, nama, google_sub, created_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
  `)
    .run(account.id, account.email, account.nama, sub, account.created_at);
  if (!result.changes) {
    // Do not link a password account by email alone (account takeover risk).
    const concurrent = db
      .prepare(
        "SELECT id, email, nama, created_at FROM users WHERE google_sub = ?",
      )
      .get(sub) as Account | undefined;
    if (concurrent) return concurrent;
    throw new AuthError("google-link-required");
  }
  return account;
}
