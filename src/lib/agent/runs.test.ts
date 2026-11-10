/** @jest-environment node */
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { latestAgentRun, saveAgentRun } from "@/lib/agent/runs";
import { testDatabaseUrl } from "@/lib/auth/test-database";
import type { AgentRunSummary } from "@/lib/orchestrator/summary";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/auth/database", () => ({ authDatabase: () => pool }));

const url = testDatabaseUrl();
const pool = new Pool({ connectionString: url });
const userA = randomUUID();
const userB = randomUUID();

const summary: AgentRunSummary = {
  runId: "run-1",
  modus: "jual-beli",
  band: "tinggi",
  plannerSource: "model",
  totalMs: 200,
  agents: [
    {
      id: "marketplace",
      label: "Marketplace Agent",
      status: "selesai",
      ms: 120,
    },
  ],
};

(url ? describe : describe.skip)("agent runs metadata", () => {
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
      for (const id of [userA, userB]) {
        await client.query(
          "INSERT INTO users(id,email,nama,created_at) VALUES($1,$2,$3,now()) ON CONFLICT DO NOTHING",
          [id, `${id}@example.test`, "Uji Agen"],
        );
      }
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.query("DELETE FROM agent_runs WHERE user_id = ANY($1::uuid[])", [
      [userA, userB],
    ]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
      [userA, userB],
    ]);
    await pool.end();
  });

  it("round-trips the sanitized summary and returns the newest row", async () => {
    await saveAgentRun(userA, summary);
    await saveAgentRun(userA, { ...summary, runId: "run-2", band: "rendah" });
    const latest = await latestAgentRun(userA);

    expect(latest).toMatchObject({
      ...summary,
      runId: "run-2",
      band: "rendah",
    });
    expect(latest?.agents[0]).toEqual({
      id: "marketplace",
      label: "Marketplace Agent",
      status: "selesai",
      ms: 120,
    });
  });

  it("never returns another account's run", async () => {
    await saveAgentRun(userB, { ...summary, runId: "run-b" });
    const latest = await latestAgentRun(userA);

    expect(latest?.runId).toBe("run-2");
  });
});
