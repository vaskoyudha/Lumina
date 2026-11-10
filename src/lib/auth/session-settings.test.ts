/** @jest-environment node */

import { registerAccount } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import {
  createSession,
  listSessions,
  readSession,
  revokeOtherSessions,
  revokeUserSession,
} from "@/lib/auth/session";
import { testDatabaseUrl } from "@/lib/auth/test-database";

jest.mock("server-only", () => ({}), { virtual: true });
const testUrl = testDatabaseUrl();
if (testUrl) process.env.DATABASE_URL = testUrl;
const integration = testUrl ? describe : describe.skip;

integration("session settings", () => {
  afterAll(async () => {
    await authDatabase().end();
  });

  beforeEach(async () => {
    await authDatabase().query(
      "DELETE FROM sessions; DELETE FROM users; DELETE FROM auth_attempts;",
    );
  });

  async function account(suffix: string) {
    return registerAccount({
      nama: "Siti Rahma",
      email: `siti-${suffix}@lumina.test`,
      password: "password123",
      consent: true,
    });
  }

  it("records device metadata and marks the current session", async () => {
    const user = await account("meta");
    const current = await createSession(user.id, undefined, {
      userAgent: "Firefox/140",
      clientIp: "103.28.1.2",
    });
    await createSession(user.id, undefined, {
      userAgent: "Chrome/140",
      clientIp: null,
    });

    const rows = await listSessions(user.id, current);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.userAgent === "Firefox/140")).toMatchObject({
      clientIp: "103.28.1.2",
      current: true,
    });
    expect(rows.find((row) => row.userAgent === "Chrome/140")).toMatchObject({
      clientIp: null,
      current: false,
    });
  });

  it("touches last_seen_at at most once per guard window", async () => {
    const user = await account("touch");
    const token = await createSession(user.id);
    await authDatabase().query(
      "UPDATE sessions SET last_seen_at = now() - interval '1 hour' WHERE user_id = $1",
      [user.id],
    );

    await readSession(token);

    const row = (
      await authDatabase().query<{ fresh: boolean }>(
        "SELECT last_seen_at > now() - interval '1 minute' AS fresh FROM sessions WHERE user_id = $1",
        [user.id],
      )
    ).rows[0];
    expect(row.fresh).toBe(true);
  });

  it("revokes only the caller's sessions", async () => {
    const mine = await account("mine");
    const other = await account("other");
    const mineToken = await createSession(mine.id);
    const otherToken = await createSession(other.id);

    const mineRows = await listSessions(mine.id, mineToken);
    expect(await revokeUserSession(mine.id, otherToken)).toBe(false);
    expect(await revokeUserSession(mine.id, mineRows[0].id)).toBe(true);
    expect(await readSession(otherToken)).not.toBeNull();
  });

  it("keeps the current session when revoking the others", async () => {
    const user = await account("others");
    const current = await createSession(user.id);
    await createSession(user.id);

    expect(await revokeOtherSessions(user.id, current)).toBe(1);
    const rows = await listSessions(user.id, current);
    expect(rows).toHaveLength(1);
    expect(rows[0].current).toBe(true);
  });
});
