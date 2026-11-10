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
export async function consumeAttempt(
  key: string,
  limit = 10,
  windowMs = 900000,
): Promise<void> {
  const result = await authDatabase().query<{ count: number }>(
    `
    INSERT INTO auth_attempts (key, count, expires_at) VALUES ($1, 1, now() + $2 * interval '1 millisecond')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN auth_attempts.expires_at <= now() THEN 1 ELSE auth_attempts.count + 1 END,
      expires_at = CASE WHEN auth_attempts.expires_at <= now() THEN EXCLUDED.expires_at ELSE auth_attempts.expires_at END RETURNING count`,
    [digest(key), windowMs],
  );
  if (result.rows[0].count > limit)
    throw new AuthError("Terlalu banyak percobaan. Coba lagi nanti.");
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
  await consumeAttempt(`register:${email}`, 5);
  const passwordHash = await hashPassword(password);
  const account = {
    id: randomUUID(),
    nama,
    email,
    created_at: new Date().toISOString(),
  };
  const result = await authDatabase().query(
    `INSERT INTO users (id, nama, email, password_hash, created_at)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT(email) DO NOTHING`,
    [account.id, nama, email, passwordHash, account.created_at],
  );
  if (!result.rowCount)
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
  await consumeAttempt(`login:${parsed.data.email}`);
  const account = (
    await authDatabase().query<AccountRecord>(
      "SELECT * FROM users WHERE email = $1",
      [parsed.data.email],
    )
  ).rows[0];
  const valid = await checkPassword(
    parsed.data.password,
    account?.password_hash,
  );
  if (!account || !valid)
    throw new AuthError(
      "Email atau password salah. Jika mendaftar lewat Google, gunakan tombol Google.",
    );
  await authDatabase().query("DELETE FROM auth_attempts WHERE key = $1", [
    digest(`login:${parsed.data.email}`),
  ]);
  return {
    id: account.id,
    nama: account.nama,
    email: account.email,
    created_at: new Date(account.created_at).toISOString(),
  };
}

/**
 * Provisions the shared demo account from server-held credentials on first use.
 * The password is never returned; callers authenticate normally afterwards.
 */
export async function ensureDemoAccount(
  email: string,
  password: string,
): Promise<Account> {
  const normalized = email.trim().toLowerCase();
  const db = authDatabase();
  const existing = (
    await db.query<AccountRecord>("SELECT * FROM users WHERE email = $1", [
      normalized,
    ])
  ).rows[0];
  if (existing)
    return {
      id: existing.id,
      nama: existing.nama,
      email: existing.email,
      created_at: new Date(existing.created_at).toISOString(),
    };
  const account: Account = {
    id: randomUUID(),
    nama: "Tamu Lumina",
    email: normalized,
    created_at: new Date().toISOString(),
  };
  const passwordHash = await hashPassword(password);
  const result = await db.query(
    `INSERT INTO users (id, nama, email, password_hash, created_at)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT(email) DO NOTHING`,
    [account.id, account.nama, account.email, passwordHash, account.created_at],
  );
  if (result.rowCount) return account;
  const concurrent = (
    await db.query<AccountRecord>("SELECT * FROM users WHERE email = $1", [
      normalized,
    ])
  ).rows[0];
  if (!concurrent) throw new AuthError("Akun demo tidak dapat disiapkan.");
  return {
    id: concurrent.id,
    nama: concurrent.nama,
    email: concurrent.email,
    created_at: new Date(concurrent.created_at).toISOString(),
  };
}

/** Only called with a Google ID token verified by google-auth-library. */
export async function googleAccount(
  sub: string,
  email: string,
  nama: string,
): Promise<Account> {
  const db = authDatabase();
  const find = async () =>
    (
      await db.query<Account>(
        "SELECT id, email, nama, created_at FROM users WHERE google_sub = $1",
        [sub],
      )
    ).rows[0];
  const existing = await find();
  if (existing)
    return {
      ...existing,
      created_at: new Date(existing.created_at).toISOString(),
    };
  const account = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    nama: nama.slice(0, 80),
    created_at: new Date().toISOString(),
  };
  const result = await db.query(
    "INSERT INTO users (id, email, nama, google_sub, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
    [account.id, account.email, account.nama, sub, account.created_at],
  );
  if (!result.rowCount) {
    const concurrent = await find();
    if (concurrent)
      return {
        ...concurrent,
        created_at: new Date(concurrent.created_at).toISOString(),
      };
    throw new AuthError("google-link-required");
  }
  return account;
}

const displayName = z.string().trim().min(1).max(80);

export async function updateAccountName(
  userId: string,
  nama: string,
): Promise<Account> {
  const parsed = displayName.safeParse(nama);
  if (!parsed.success) throw new AuthError("Nama harus 1–80 karakter.");
  const row = (
    await authDatabase().query<Account>(
      `UPDATE users SET nama = $2
       WHERE id = $1
       RETURNING id, email, nama, created_at`,
      [userId, parsed.data],
    )
  ).rows[0];
  if (!row) throw new AuthError("Akun tidak ditemukan.");
  return { ...row, created_at: new Date(row.created_at).toISOString() };
}

export async function changeAccountPassword(
  userId: string,
  current: string,
  next: string,
): Promise<void> {
  const parsed = z
    .object({
      current: z.string().max(128),
      next: z.string().min(8).max(128),
    })
    .safeParse({ current, next });
  if (!parsed.success)
    throw new AuthError("Password baru harus 8–128 karakter.");

  const row = (
    await authDatabase().query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId],
    )
  ).rows[0];
  if (!row) throw new AuthError("Akun tidak ditemukan.");
  if (!row.password_hash)
    throw new AuthError(
      "Akun ini masuk lewat Google. Password belum dapat diubah di sini.",
    );
  if (!(await checkPassword(parsed.data.current, row.password_hash)))
    throw new AuthError("Password saat ini salah.");

  await authDatabase().query(
    "UPDATE users SET password_hash = $2 WHERE id = $1",
    [userId, await hashPassword(parsed.data.next)],
  );
}
