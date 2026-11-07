/** @jest-environment node */

import {
  authenticatePassword,
  consumeAttempt,
  digest,
  googleAccount,
  registerAccount,
} from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import { createSession, readSession, revokeSession } from "@/lib/auth/session";
import { testDatabaseUrl } from "@/lib/auth/test-database";

jest.mock("server-only", () => ({}), { virtual: true });
const testUrl = testDatabaseUrl();
if (testUrl) process.env.DATABASE_URL = testUrl;
const integration = testUrl ? describe : describe.skip;
integration("PostgreSQL integration", () => {
  afterAll(async () => {
    await authDatabase().end();
  });
  beforeEach(async () => {
    await authDatabase().query(
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
      const firstToken = await createSession(account.id);
      expect((await readSession(firstToken))?.email).toBe(input.email);
      await revokeSession(firstToken);
      expect(await readSession(firstToken)).toBeNull();
      const signedIn = await authenticatePassword(input.email, input.password);
      expect(signedIn.id).toBe(account.id);
      expect((await readSession(await createSession(signedIn.id)))?.nama).toBe(
        "Rina",
      );
      const row = (
        await authDatabase().query(
          "SELECT password_hash FROM users WHERE id = $1",
          [account.id],
        )
      ).rows[0];
      expect(row?.password_hash).toMatch(/^scrypt\$/);
      expect(JSON.stringify(row)).not.toContain(input.password);
    });

    it("stores only token hashes and rejects tampered, expired, and legacy tokens", async () => {
      const account = await registerAccount(input);
      const token = await createSession(account.id);
      const row = (
        await authDatabase().query("SELECT token_hash FROM sessions")
      ).rows[0];
      expect(row?.token_hash).toBe(digest(token));
      expect(await readSession(`${token}x`)).toBeNull();
      expect(await readSession("legacy.signed-cookie")).toBeNull();
      expect(await readSession(undefined)).toBeNull();
      await authDatabase().query(
        "UPDATE sessions SET expires_at = now() - interval '1 minute'",
      );
      expect(await readSession(token)).toBeNull();
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
      await authDatabase().query(
        "INSERT INTO auth_attempts (key, count, expires_at) VALUES ($1, 10, now() + interval '10 minutes')",
        [digest(`login:${input.email}`)],
      );
      await expect(
        authenticatePassword(input.email, input.password),
      ).rejects.toThrow(/Terlalu banyak percobaan/);
    });

    it("rolls back session rotation when insertion fails", async () => {
      const account = await registerAccount(input);
      const token = await createSession(account.id);
      await expect(
        createSession("00000000-0000-4000-8000-000000000000", token),
      ).rejects.toThrow();
      expect((await readSession(token))?.id).toBe(account.id);
      const replacement = await createSession(account.id, token);
      expect(await readSession(token)).toBeNull();
      expect((await readSession(replacement))?.id).toBe(account.id);
    });
    it("enforces an atomic quota under concurrent requests", async () => {
      const attempts = await Promise.allSettled(
        Array.from({ length: 20 }, () => consumeAttempt("race", 10, 60000)),
      );
      expect(
        attempts.filter((entry) => entry.status === "fulfilled"),
      ).toHaveLength(10);
      expect(
        attempts.filter((entry) => entry.status === "rejected"),
      ).toHaveLength(10);
    });
    it("allows only one registration for a normalized email under race", async () => {
      const attempts = await Promise.allSettled([
        registerAccount(input),
        registerAccount({ ...input, email: "RINA@EXAMPLE.COM" }),
      ]);
      expect(
        attempts.filter((entry) => entry.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        attempts.filter((entry) => entry.status === "rejected"),
      ).toHaveLength(1);
    });
    it("keeps Google identity stable and refuses implicit password-account linking", async () => {
      const google = await googleAccount(
        "google-sub-1",
        "google@example.com",
        "Google Rina",
      );
      expect(
        (await googleAccount("google-sub-1", "new@example.com", "Rina")).id,
      ).toBe(google.id);
      await expect(
        authenticatePassword(google.email, "password-ku-aman"),
      ).rejects.toThrow(/gunakan tombol Google/);
      await registerAccount(input);
      await expect(
        googleAccount("google-sub-2", input.email, "Impostor"),
      ).rejects.toThrow("google-link-required");
    });
  });
});
