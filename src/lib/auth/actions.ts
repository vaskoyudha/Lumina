"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type Account,
  AuthError,
  authenticatePassword,
  changeAccountPassword,
  consumeAttempt,
  ensureDemoAccount,
  registerAccount,
  updateAccountName,
} from "@/lib/auth/accounts";
import {
  createSession,
  readSession,
  revokeAllSessions,
  revokeOtherSessions,
  revokeSession,
  revokeUserSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { requestMeta } from "@/lib/server/request";

export interface AuthResult {
  ok: boolean;
  error?: string;
  account?: { email: string; nama: string };
}

export interface SettingsResult {
  ok: boolean;
  error?: string;
  account?: { nama: string; email: string };
}

async function signedIn(account: Account): Promise<AuthResult> {
  const jar = await cookies();
  const token = await createSession(
    account.id,
    jar.get(SESSION_COOKIE)?.value,
    requestMeta(await headers()),
  );
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
  return { ok: true, account: { email: account.email, nama: account.nama } };
}

function failure(error: unknown): { ok: false; error: string } {
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

async function currentAccount() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return { jar, token, session: await readSession(token) };
}

export async function updateNama(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  try {
    const { session } = await currentAccount();
    if (!session)
      return {
        ok: false,
        error: "Sesi berakhir. Masuk lagi untuk melanjutkan.",
      };
    await consumeAttempt(`account:name:${session.id}`, 20, 600000);
    const account = await updateAccountName(
      session.id,
      String(formData.get("nama") ?? ""),
    );
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
    return { ok: true, account: { nama: account.nama, email: account.email } };
  } catch (error) {
    return failure(error);
  }
}

export async function changePasswordAction(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  try {
    const { session, token } = await currentAccount();
    if (!session)
      return {
        ok: false,
        error: "Sesi berakhir. Masuk lagi untuk melanjutkan.",
      };
    const next = String(formData.get("password") ?? "");
    if (next !== String(formData.get("konfirmasi") ?? ""))
      return { ok: false, error: "Konfirmasi password tidak sama." };
    await consumeAttempt(`account:password:${session.id}`, 5, 900000);
    await changeAccountPassword(
      session.id,
      String(formData.get("current") ?? ""),
      next,
    );
    await revokeOtherSessions(session.id, token);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeSessionAction(
  tokenHash: string,
): Promise<SettingsResult> {
  try {
    if (!/^[a-f0-9]{64}$/.test(tokenHash))
      return { ok: false, error: "Sesi tidak dikenal." };
    const { session } = await currentAccount();
    if (!session)
      return {
        ok: false,
        error: "Sesi berakhir. Masuk lagi untuk melanjutkan.",
      };
    const removed = await revokeUserSession(session.id, tokenHash);
    return removed
      ? { ok: true }
      : { ok: false, error: "Sesi itu sudah tidak aktif." };
  } catch (error) {
    return failure(error);
  }
}

export async function logoutEverywhere(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  try {
    const session = await readSession(token);
    if (session) await revokeAllSessions(session.id);
    else await revokeSession(token);
  } catch {
    throw new Error(
      "Layanan akun sedang tidak tersedia. Coba keluar lagi sebentar.",
    );
  }
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
