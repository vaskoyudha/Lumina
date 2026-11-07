/** @jest-environment node */

import {
  authenticatePassword,
  digest,
  googleAccount,
  registerAccount,
} from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import { createSession, readSession, revokeSession } from "@/lib/auth/session";

jest.mock("server-only", () => ({}), { virtual: true });
process.env.AUTH_DATABASE_PATH = ":memory:";

beforeEach(() => {
  authDatabase().exec(
    "DELETE FROM sessions; DELETE FROM users; DELETE FROM auth_attempts;",
  );
});

const input = {
  nama: "Rina",
  email: "rina@example.com",
  password: "password-ku-aman",
  consent: true,
};

describe("persistent password accounts and sessions", () => {
  it("can register, log out, and log back in with the same account", async () => {
    const account = await registerAccount({
      ...input,
      email: " RINA@EXAMPLE.COM ",
    });
    const firstToken = createSession(account.id);
    expect(readSession(firstToken)?.email).toBe(input.email);
    revokeSession(firstToken);
    expect(readSession(firstToken)).toBeNull();
    const signedIn = await authenticatePassword(input.email, input.password);
    expect(signedIn.id).toBe(account.id);
    expect(readSession(createSession(signedIn.id))?.nama).toBe("Rina");
    const row = authDatabase()
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(account.id);
    expect(row?.password_hash).toMatch(/^scrypt\$/);
    expect(JSON.stringify(row)).not.toContain(input.password);
  });

  it("stores only token hashes and rejects tampered, expired, and legacy tokens", async () => {
    const account = await registerAccount(input);
    const token = createSession(account.id);
    const row = authDatabase().prepare("SELECT token_hash FROM sessions").get();
    expect(row?.token_hash).toBe(digest(token));
    expect(readSession(`${token}x`)).toBeNull();
    expect(readSession("legacy.signed-cookie")).toBeNull();
    expect(readSession(undefined)).toBeNull();
    authDatabase().prepare("UPDATE sessions SET expires_at = 1").run();
    expect(readSession(token)).toBeNull();
  });

  it("rejects invalid registration, wrong passwords and duplicate normalized emails", async () => {
    await expect(
      registerAccount({ ...input, consent: false }),
    ).rejects.toThrow();
    await expect(
      registerAccount({ ...input, password: "short" }),
    ).rejects.toThrow();
    await registerAccount(input);
    await expect(
      registerAccount({ ...input, email: "RINA@example.com" }),
    ).rejects.toThrow(/tidak dapat didaftarkan/);
    await expect(
      authenticatePassword(input.email, "salah-password"),
    ).rejects.toThrow(/Email atau password salah/);
    await expect(
      authenticatePassword("unknown@example.com", input.password),
    ).rejects.toThrow(/Email atau password salah/);
  });

  it("enforces a persistent login attempt limit", async () => {
    await registerAccount(input);
    authDatabase()
      .prepare(
        "INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 10, ?)",
      )
      .run(digest(`login:${input.email}`), Date.now() + 600_000);
    await expect(
      authenticatePassword(input.email, input.password),
    ).rejects.toThrow(/Terlalu banyak percobaan/);
  });

  it("keeps Google identity stable and refuses implicit password-account linking", async () => {
    const google = googleAccount(
      "google-sub-1",
      "google@example.com",
      "Google Rina",
    );
    expect(googleAccount("google-sub-1", "new@example.com", "Rina").id).toBe(
      google.id,
    );
    await expect(
      authenticatePassword(google.email, "password-ku-aman"),
    ).rejects.toThrow(/gunakan tombol Google/);
    await registerAccount(input);
    expect(() =>
      googleAccount("google-sub-2", input.email, "Impostor"),
    ).toThrow("google-link-required");
  });
});
