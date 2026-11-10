/** @jest-environment node */
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/server-session";
import { testDatabaseUrl } from "@/lib/auth/test-database";
import {
  listConversationHistory,
  saveConversationHistory,
} from "@/lib/companion/history";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/auth/database", () => ({ authDatabase: () => pool }));
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));

const url = testDatabaseUrl();
const pool = new Pool({ connectionString: url });
const userA = randomUUID(),
  userB = randomUUID();
const signedIn = (id: string) => ({
  id,
  email: `${id}@example.test`,
  nama: "Uji Riwayat",
  created_at: "2026-11-10T00:00:00.000Z",
  exp: 9_999_999_999,
});

(url ? describe : describe.skip)("companion history metadata", () => {
  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
      );
      for (const name of (await readdir("migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort()) {
        if (
          (
            await client.query(
              "SELECT 1 FROM schema_migrations WHERE version=$1",
              [name],
            )
          ).rowCount
        )
          continue;
        await client.query("BEGIN");
        try {
          await client.query(await readFile(`migrations/${name}`, "utf8"));
          await client.query(
            "INSERT INTO schema_migrations(version) VALUES($1)",
            [name],
          );
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
      await client.query(
        "INSERT INTO users(id,email,nama,created_at) VALUES($1,$2,'Anggota A',now()),($3,$4,'Anggota B',now())",
        [userA, `${userA}@example.test`, userB, `${userB}@example.test`],
      );
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
      [userA, userB],
    ]);
    await pool.end();
  });

  beforeEach(() => jest.clearAllMocks());

  it("lists only the signed-in account's rows and refuses to take over another row", async () => {
    const id = randomUUID();
    jest.mocked(getSession).mockResolvedValue(signedIn(userA));
    expect(
      await saveConversationHistory({
        id,
        title: "Kurir palsu kirim APK",
        turns: 2,
        risk: "tinggi",
      }),
    ).toEqual({ ok: true });

    const mine = await listConversationHistory();
    expect(mine.ok).toBe(true);
    expect(mine.conversations.find((item) => item.id === id)).toMatchObject({
      title: "Kurir palsu kirim APK",
      turns: 2,
      risk: "tinggi",
    });

    jest.mocked(getSession).mockResolvedValue(signedIn(userB));
    expect(await listConversationHistory()).toEqual({
      ok: true,
      conversations: [],
    });
    expect(
      await saveConversationHistory({ id, title: "Bajak riwayat", turns: 9 }),
    ).toEqual({ ok: false, error: expect.stringMatching(/tidak tersedia/) });

    jest.mocked(getSession).mockResolvedValue(signedIn(userA));
    const after = await listConversationHistory();
    expect(after.conversations.find((item) => item.id === id)).toMatchObject({
      title: "Kurir palsu kirim APK",
      turns: 2,
    });
  });

  it("updates title, turns and risk in place without duplicating the row", async () => {
    const id = randomUUID();
    jest.mocked(getSession).mockResolvedValue(signedIn(userA));
    await saveConversationHistory({ id, title: "Awal", turns: 1 });
    await saveConversationHistory({
      id,
      title: "Awal diperpanjang",
      turns: 4,
      risk: "rendah",
    });
    const list = await listConversationHistory();
    const rows = list.conversations.filter((item) => item.id === id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Awal diperpanjang",
      turns: 4,
      risk: "rendah",
    });
  });

  it("rejects guests and malformed ids before writing", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    expect(
      (
        await saveConversationHistory({
          id: randomUUID(),
          title: "Tamu",
          turns: 1,
        })
      ).ok,
    ).toBe(false);
    expect(await listConversationHistory()).toEqual({
      ok: false,
      conversations: [],
    });

    jest.mocked(getSession).mockResolvedValue(signedIn(userA));
    expect(
      (
        await saveConversationHistory({
          id: "bukan-uuid",
          title: "Tidak valid",
          turns: 1,
        })
      ).ok,
    ).toBe(false);
  });
});
