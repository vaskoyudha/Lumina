/** @jest-environment node */

import { digest, registerAccount } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import {
  createSession,
  listSessions,
  readSession,
  revokeAllSessions,
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

    const touched = (
      await authDatabase().query<{ last_seen_at: Date; fresh: boolean }>(
        "SELECT last_seen_at, last_seen_at > now() - interval '1 minute' AS fresh FROM sessions WHERE user_id = $1",
        [user.id],
      )
    ).rows[0];
    expect(touched.fresh).toBe(true);

    await readSession(token);

    const untouched = (
      await authDatabase().query<{ last_seen_at: Date }>(
        "SELECT last_seen_at FROM sessions WHERE user_id = $1",
        [user.id],
      )
    ).rows[0];
    expect(new Date(untouched.last_seen_at).getTime()).toBe(
      new Date(touched.last_seen_at).getTime(),
    );
  });

  it("orders sessions by newest activity", async () => {
    const user = await account("order");
    const older = await createSession(user.id);
    const newer = await createSession(user.id);
    await authDatabase().query(
      `UPDATE sessions SET last_seen_at =
        CASE WHEN token_hash = $1 THEN now() - interval '2 minutes' ELSE now() - interval '1 minute' END
       WHERE user_id = $2`,
      [digest(older), user.id],
    );

    const rows = await listSessions(user.id, newer);
    expect(rows.map((row) => row.id)).toEqual([digest(newer), digest(older)]);
    expect(rows[0].current).toBe(true);
    expect(rows[1].current).toBe(false);
  });

  it("excludes expired sessions", async () => {
    const user = await account("expired");
    const live = await createSession(user.id);
    const expired = await createSession(user.id);
    await authDatabase().query(
      "UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE token_hash = $1",
      [digest(expired)],
    );

    const rows = await listSessions(user.id, live);
    expect(rows.map((row) => row.id)).toEqual([digest(live)]);
  });

  it("caps the list at 50 sessions", async () => {
    const user = await account("cap");
    for (let index = 0; index < 51; index += 1)
      await createSession(user.id, undefined, {
        userAgent: `Device/${index}`,
      });

    expect(await listSessions(user.id)).toHaveLength(50);
  }, 20000);

  it("revokes every session for the account", async () => {
    const user = await account("all");
    const first = await createSession(user.id);
    await createSession(user.id);

    expect(await revokeAllSessions(user.id)).toBe(2);
    expect(await listSessions(user.id)).toHaveLength(0);
    expect(await readSession(first)).toBeNull();
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
