"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type Account,
  AuthError,
  authenticatePassword,
  consumeAttempt,
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
  const token = createSession(account.id);
  revokeSession(jar.get(SESSION_COOKIE)?.value);
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
    consumeAttempt("login:global", 200);
    const account = await authenticatePassword(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );
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
    consumeAttempt("register:global", 50);
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
  revokeSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
