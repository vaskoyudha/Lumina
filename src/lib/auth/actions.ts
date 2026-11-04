"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type DemoAccount,
  emailTaken,
  findDemoAccount,
} from "@/lib/auth/demo-accounts";
import {
  newPayload,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signPayload,
} from "@/lib/auth/session";

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** Present on success so the client can seed local progress. */
  account?: { email: string; nama: string; seed: DemoAccount["seed"] };
}

export async function login(
  _prev: AuthResult | undefined,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email dan password harus diisi." };
  }

  const account = findDemoAccount(email, password);
  if (!account) {
    // Deliberately does not reveal whether the email exists.
    return {
      ok: false,
      error: "Email atau password salah. Coba akun demo di bawah.",
    };
  }

  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    signPayload(newPayload(account.email, account.nama)),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  );

  return {
    ok: true,
    account: { email: account.email, nama: account.nama, seed: account.seed },
  };
}

export async function register(
  _prev: AuthResult | undefined,
  formData: FormData,
): Promise<AuthResult> {
  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent");

  if (!nama || !email || !password) {
    return { ok: false, error: "Nama, email, dan password harus diisi." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Format email belum benar." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password minimal 8 karakter." };
  }
  if (!consent) {
    return { ok: false, error: "Centang persetujuan dulu untuk melanjutkan." };
  }
  if (emailTaken(email)) {
    return {
      ok: false,
      error: "Email itu sudah dipakai akun demo. Pakai email lain.",
    };
  }

  // No account record is created anywhere. The profile lives on this device,
  // written by the client after this returns.
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signPayload(newPayload(email, nama)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return {
    ok: true,
    account: { email, nama, seed: { completedModules: [], badges: [] } },
  };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
