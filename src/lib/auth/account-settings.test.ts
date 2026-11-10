/** @jest-environment node */

import {
  AuthError,
  authenticatePassword,
  changeAccountPassword,
  registerAccount,
  updateAccountName,
} from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import { testDatabaseUrl } from "@/lib/auth/test-database";

jest.mock("server-only", () => ({}), { virtual: true });
const testUrl = testDatabaseUrl();
if (testUrl) process.env.DATABASE_URL = testUrl;
const integration = testUrl ? describe : describe.skip;

integration("account settings mutations", () => {
  afterAll(async () => {
    await authDatabase().end();
  });

  beforeEach(async () => {
    await authDatabase().query(
      "DELETE FROM sessions; DELETE FROM users; DELETE FROM auth_attempts;",
    );
  });

  const email = "settings@lumina.test";
  const password = "password123";

  async function user() {
    return registerAccount({
      nama: "Siti Rahma",
      email,
      password,
      consent: true,
    });
  }

  it("renames the account and trims the value", async () => {
    const account = await user();
    const updated = await updateAccountName(account.id, "  Siti Baru  ");
    expect(updated.nama).toBe("Siti Baru");
    const row = (
      await authDatabase().query<{ nama: string }>(
        "SELECT nama FROM users WHERE id = $1",
        [account.id],
      )
    ).rows[0];
    expect(row.nama).toBe("Siti Baru");
  });

  it("rejects an empty name", async () => {
    const account = await user();
    await expect(updateAccountName(account.id, "   ")).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("changes the password only with the current one", async () => {
    const account = await user();
    await expect(
      changeAccountPassword(account.id, "salah-password", "password456"),
    ).rejects.toThrow(/password saat ini salah/i);

    await changeAccountPassword(account.id, password, "password456");
    const signedIn = await authenticatePassword(email, "password456");
    expect(signedIn.id).toBe(account.id);
    await expect(authenticatePassword(email, password)).rejects.toThrow();
  });

  it("refuses a password change for a Google-only account", async () => {
    const account = await user();
    await authDatabase().query(
      "UPDATE users SET password_hash = NULL, google_sub = 'google-1' WHERE id = $1",
      [account.id],
    );
    await expect(
      changeAccountPassword(account.id, "anything", "password456"),
    ).rejects.toThrow(/google/i);
  });
});
