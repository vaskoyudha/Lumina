/** @jest-environment node */

import { cookies, headers } from "next/headers";
import {
  authenticatePassword,
  changeAccountPassword,
  consumeAttempt,
  ensureDemoAccount,
  updateAccountName,
} from "@/lib/auth/accounts";
import {
  changePasswordAction,
  login,
  loginDemo,
  logout,
  register,
  revokeSessionAction,
  updateNama,
} from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/server-session";
import { createSession, readSession, revokeSession } from "@/lib/auth/session";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("next/headers", () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/server", () => ({
  connection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/lib/auth/accounts", () => ({
  AuthError: class AuthError extends Error {},
  consumeAttempt: jest.fn(),
  authenticatePassword: jest.fn(),
  ensureDemoAccount: jest.fn(),
  registerAccount: jest.fn(),
  updateAccountName: jest.fn(),
  changeAccountPassword: jest.fn(),
}));
jest.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE: "lumina_session",
  readSession: jest.fn(),
  revokeSession: jest.fn(),
  revokeUserSession: jest.fn(),
  revokeOtherSessions: jest.fn(),
  revokeAllSessions: jest.fn(),
  createSession: jest.fn(),
  sessionCookieOptions: {},
}));
beforeEach(() => {
  jest
    .mocked(headers)
    .mockResolvedValue(new Headers({ "user-agent": "jest" }) as never);
});
it("returns controlled errors for failed registration and login", async () => {
  jest.mocked(consumeAttempt).mockRejectedValue(new Error("database secret"));
  for (const action of [login, register]) {
    const result = await action(undefined, new FormData());
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain("secret");
  }
});
it("renders anonymous when session storage fails", async () => {
  jest
    .mocked(cookies)
    .mockResolvedValue({ get: () => ({ value: "token" }) } as never);
  jest.mocked(readSession).mockRejectedValue(new Error("database secret"));
  expect(await getSession()).toBeNull();
});
it("keeps the browser cookie when server revocation fails", async () => {
  const remove = jest.fn();
  jest.mocked(cookies).mockResolvedValue({
    get: () => ({ value: "token" }),
    delete: remove,
  } as never);
  jest.mocked(revokeSession).mockRejectedValue(new Error("database secret"));
  await expect(logout()).rejects.toThrow("Layanan akun sedang tidak tersedia");
  expect(remove).not.toHaveBeenCalled();
});

it("refuses the demo entrypoint when it is not configured", async () => {
  const previousEmail = process.env.LUMINA_DEMO_EMAIL;
  delete process.env.LUMINA_DEMO_EMAIL;
  const result = await loginDemo();
  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/belum dikonfigurasi/i);
  if (previousEmail !== undefined)
    process.env.LUMINA_DEMO_EMAIL = previousEmail;
});

it("signs into the configured demo account without exposing credentials", async () => {
  const previousEmail = process.env.LUMINA_DEMO_EMAIL;
  const previousPassword = process.env.LUMINA_DEMO_PASSWORD;
  process.env.LUMINA_DEMO_EMAIL = "demo@lumina.id";
  process.env.LUMINA_DEMO_PASSWORD = "rahasia-demo";
  const set = jest.fn();
  jest.mocked(cookies).mockResolvedValue({
    get: () => undefined,
    set,
  } as never);
  jest.mocked(ensureDemoAccount).mockResolvedValue({
    id: "demo-id",
    email: "demo@lumina.id",
    nama: "Tamu Lumina",
    created_at: new Date(0).toISOString(),
  });
  jest.mocked(authenticatePassword).mockResolvedValue({
    id: "demo-id",
    email: "demo@lumina.id",
    nama: "Tamu Lumina",
    created_at: new Date(0).toISOString(),
  });
  jest.mocked(createSession).mockResolvedValue("token-demo");
  const result = await loginDemo();
  expect(result).toEqual({
    ok: true,
    account: { email: "demo@lumina.id", nama: "Tamu Lumina" },
  });
  expect(set).toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain("rahasia-demo");
  if (previousEmail === undefined) delete process.env.LUMINA_DEMO_EMAIL;
  else process.env.LUMINA_DEMO_EMAIL = previousEmail;
  if (previousPassword === undefined) delete process.env.LUMINA_DEMO_PASSWORD;
  else process.env.LUMINA_DEMO_PASSWORD = previousPassword;
});

it("refuses settings actions without a session", async () => {
  jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  jest.mocked(readSession).mockResolvedValue(null);
  await expect(updateNama(undefined, new FormData())).resolves.toMatchObject({
    ok: false,
  });
  await expect(
    changePasswordAction(undefined, new FormData()),
  ).resolves.toMatchObject({ ok: false });
});

it("rejects a mismatched password confirmation before touching the store", async () => {
  jest.mocked(cookies).mockResolvedValue({
    get: () => ({ value: "token" }),
  } as never);
  jest.mocked(readSession).mockResolvedValue({
    id: "user-1",
    email: "siti@lumina.id",
    nama: "Siti",
    created_at: "2026-01-02T00:00:00.000Z",
    exp: 0,
  });
  const form = new FormData();
  form.set("password", "password456");
  form.set("konfirmasi", "password789");
  await expect(changePasswordAction(undefined, form)).resolves.toMatchObject({
    ok: false,
    error: expect.stringMatching(/konfirmasi/i),
  });
});

it("rejects a malformed session id", async () => {
  await expect(revokeSessionAction("../../etc/passwd")).resolves.toMatchObject({
    ok: false,
  });
});

it("rate-limits name and password mutations per account", async () => {
  jest.mocked(cookies).mockResolvedValue({
    get: () => ({ value: "token" }),
  } as never);
  jest.mocked(readSession).mockResolvedValue({
    id: "user-1",
    email: "siti@lumina.id",
    nama: "Siti",
    created_at: "2026-01-02T00:00:00.000Z",
    exp: 0,
  });
  jest.mocked(consumeAttempt).mockClear();
  jest.mocked(consumeAttempt).mockResolvedValue(undefined as never);
  jest.mocked(updateAccountName).mockResolvedValue({
    id: "user-1",
    email: "siti@lumina.id",
    nama: "Siti Baru",
    created_at: "2026-01-02T00:00:00.000Z",
  });
  jest.mocked(changeAccountPassword).mockResolvedValue(undefined);

  const nameForm = new FormData();
  nameForm.set("nama", "Siti Baru");
  await expect(updateNama(undefined, nameForm)).resolves.toMatchObject({
    ok: true,
    account: { nama: "Siti Baru", email: "siti@lumina.id" },
  });
  expect(consumeAttempt).toHaveBeenCalledWith(
    "account:name:user-1",
    20,
    600000,
  );

  const passwordForm = new FormData();
  passwordForm.set("current", "password123");
  passwordForm.set("password", "password456");
  passwordForm.set("konfirmasi", "password456");
  await expect(
    changePasswordAction(undefined, passwordForm),
  ).resolves.toMatchObject({ ok: true });
  expect(consumeAttempt).toHaveBeenCalledWith(
    "account:password:user-1",
    5,
    900000,
  );
});
