"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type Account,
  AuthError,
  authenticatePassword,
  consumeAttempt,
  ensureDemoAccount,
  registerAccount,
} from "@/lib/auth/accounts";
import {
  createSession,
  revokeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

export interface AuthResult {
  ok: boolean;
  error?: string;
  account?: { email: string; nama: string };
}

async function signedIn(account: Account): Promise<AuthResult> {
  const jar = await cookies();
  const token = await createSession(account.id, jar.get(SESSION_COOKIE)?.value);
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
  return { ok: true, account: { email: account.email, nama: account.nama } };
}

function failure(error: unknown): AuthResult {
  return {
    ok: false,
    error:
      error instanceof AuthError
        ? error.message
        : "Layanan akun sedang tidak tersedia. Coba lagi sebentar.",
  };
}

export async function login(
  _prev: AuthResult | undefined,
  formData: FormData,
): Promise<AuthResult> {
  try {
    await consumeAttempt("login:global", 200);
    const account = await authenticatePassword(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );
    return await signedIn(account);
  } catch (error) {
    return failure(error);
  }
}

/**
 * Signs into the shared demo account using credentials held only on the
 * server. The browser never receives the password, and the resulting session
 * belongs to a real database account (see docs/auth.md).
 */
export async function loginDemo(): Promise<AuthResult> {
  const email = process.env.LUMINA_DEMO_EMAIL?.trim();
  const password = process.env.LUMINA_DEMO_PASSWORD;
  if (!email || !password)
    return { ok: false, error: "Akun demo belum dikonfigurasi." };
  try {
    await ensureDemoAccount(email, password);
    const account = await authenticatePassword(email, password);
    return await signedIn(account);
  } catch (error) {
    return failure(error);
  }
}

export async function register(
  _prev: AuthResult | undefined,
  formData: FormData,
): Promise<AuthResult> {
  try {
    await consumeAttempt("register:global", 50);
    const account = await registerAccount({
      nama: String(formData.get("nama") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      consent: formData.get("consent") === "on",
    });
    return await signedIn(account);
  } catch (error) {
    return failure(error);
  }
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  try {
    await revokeSession(jar.get(SESSION_COOKIE)?.value);
  } catch {
    throw new Error(
      "Layanan akun sedang tidak tersedia. Coba keluar lagi sebentar.",
    );
  }
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
