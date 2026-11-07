/** @jest-environment node */

import { cookies } from "next/headers";
import { consumeAttempt } from "@/lib/auth/accounts";
import { login, logout, register } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/server-session";
import { readSession, revokeSession } from "@/lib/auth/session";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("next/server", () => ({
  connection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/lib/auth/accounts", () => ({
  AuthError: class AuthError extends Error {},
  consumeAttempt: jest.fn(),
  authenticatePassword: jest.fn(),
  registerAccount: jest.fn(),
}));
jest.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE: "lumina_session",
  readSession: jest.fn(),
  revokeSession: jest.fn(),
  createSession: jest.fn(),
  sessionCookieOptions: {},
}));
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
