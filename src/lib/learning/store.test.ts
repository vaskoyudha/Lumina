/** @jest-environment node */
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { testDatabaseUrl } from "@/lib/auth/test-database";
import { CONTENT_FIXTURE, SIMULATION_FIXTURE } from "@/lib/content/fixtures";
import { getModule } from "@/lib/content/store";
import {
  readAccountProgress,
  readSimulationResults,
  recordSimulationIntrusion,
  saveQuiz,
  saveSimulation,
} from "@/lib/learning/store";
import type { SimulationSubmission } from "@/lib/learning/validation";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/auth/database", () => ({ authDatabase: () => pool }));
const url = testDatabaseUrl();
const pool = new Pool({ connectionString: url });
const userA = randomUUID(),
  userB = randomUUID();
const suite = url ? describe : describe.skip;
suite("account learning PostgreSQL", () => {
  beforeAll(async () => {
    const c = await pool.connect();
    try {
      await c.query(
        "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
      );
      for (const file of (await readdir("migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort()) {
        if (
          (
            await c.query("SELECT 1 FROM schema_migrations WHERE version=$1", [
              file,
            ])
          ).rowCount
        )
          continue;
        await c.query(await readFile(`migrations/${file}`, "utf8"));
        await c.query("INSERT INTO schema_migrations(version) VALUES($1)", [
          file,
        ]);
      }
      for (const m of CONTENT_FIXTURE.modules)
        await c.query(
          "INSERT INTO learning_modules(no,metadata,content) VALUES($1,$2,$3) ON CONFLICT(no) DO UPDATE SET metadata=EXCLUDED.metadata,content=EXCLUDED.content",
          [
            m.metadata.no,
            JSON.stringify(m.metadata),
            JSON.stringify(m.content),
          ],
        );
      await c.query(
        "INSERT INTO simulation_scenarios(id,module_no,payload) VALUES($1,10,$2) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload",
        [
          SIMULATION_FIXTURE.scenario.scenario.id,
          JSON.stringify(SIMULATION_FIXTURE),
        ],
      );
      await c.query(
        "INSERT INTO users(id,email,nama,created_at) VALUES ($1,$2,'Test A',now()),($3,$4,'Test B',now())",
        [userA, `${userA}@example.test`, userB, `${userB}@example.test`],
      );
    } finally {
      c.release();
    }
  });
  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
      [userA, userB],
    ]);
    await pool.end();
  });
  it("reads edited DB content rather than a bundled module", async () => {
    const previous = await getModule(1);
    try {
      await pool.query(
        "UPDATE learning_modules SET metadata=jsonb_set(metadata,'{nama}','\"Judul dari database\"') WHERE no=1",
      );
      expect((await getModule(1))?.metadata.nama).toBe("Judul dari database");
    } finally {
      await pool.query("UPDATE learning_modules SET metadata=$1 WHERE no=1", [
        JSON.stringify(previous?.metadata),
      ]);
    }
  });
  it("grades quiz answers on the server and isolates account progress", async () => {
    const questions = CONTENT_FIXTURE.modules.find((m) => m.metadata.no === 10)
      ?.content?.kuis;
    if (!questions) throw new Error("Missing fixture");
    const wrong = Object.fromEntries(
      questions.map((q) => [
        q.id,
        q.options.find((o) => o.id !== q.correctId)?.id ?? "",
      ]),
    );
    await expect(saveQuiz(userA, 10, wrong, true)).rejects.toThrow(/60%/);
    await expect(saveQuiz(userA, 10, {}, true)).rejects.toThrow(/semua soal/);
    const correct = Object.fromEntries(
      questions.map((q) => [q.id, q.correctId]),
    );
    const saved = await saveQuiz(userA, 10, correct, true);
    expect(saved.completedModules).toEqual([10]);
    expect(saved.badges).toEqual(["penjaga-apk"]);
    expect((await readAccountProgress(userB)).completedModules).toEqual([]);
    expect((await readAccountProgress(userA)).completedModules).toEqual([10]);
    await saveQuiz(userA, 10, wrong, false);
    expect((await readAccountProgress(userA)).completedModules).toEqual([10]);
    expect((await readAccountProgress(userA)).missedPatterns).toHaveLength(
      questions.length,
    );
  });
  function success(): SimulationSubmission {
    const scenario = SIMULATION_FIXTURE.scenario;
    let id = scenario.start;
    const steps: SimulationSubmission["steps"] = [];
    for (let i = 0; i < 100; i++) {
      const n = scenario.nodes.find((node) => node.id === id);
      if (!n) throw new Error("Broken fixture");
      if (n.type === "ending")
        return {
          attemptId: randomUUID(),
          scenarioId: scenario.scenario.id,
          mode: "santai",
          outcome: n.variant,
          steps,
        };
      if (n.type === "message") id = n.next;
      if (n.type === "choice") {
        const index = n.choices.findIndex((c) => c.verdict === "benar");
        steps.push({ nodeId: n.id, choiceIndex: index });
        id = n.choices[index].next;
      }
      if (n.type === "tool_task") {
        steps.push({ nodeId: n.id });
        id = n.on_success;
      }
    }
    throw new Error("No ending");
  }
  it("validates paths, saves once on retry and isolates simulation history", async () => {
    const run = success();
    await expect(
      saveSimulation(userA, { ...run, steps: [] }),
    ).rejects.toThrow();
    await expect(
      saveSimulation(userA, { ...run, outcome: "compromised" }),
    ).rejects.toThrow();
    await saveSimulation(userA, run);
    await saveSimulation(userA, run);
    expect(await readSimulationResults(userA)).toHaveLength(1);
    expect(await readSimulationResults(userB)).toHaveLength(0);
    await expect(saveSimulation(userB, run)).rejects.toThrow(/tidak cocok/);
  });
  it("rejects premature timer failures and accepts only an elapsed account-owned receipt", async () => {
    const submission: SimulationSubmission = {
      attemptId: randomUUID(),
      scenarioId: SIMULATION_FIXTURE.scenario.scenario.id,
      mode: "tantangan",
      outcome: "failed",
      steps: [{ nodeId: "decision", choiceIndex: 2 }],
    };
    await expect(saveSimulation(userA, submission)).rejects.toThrow(
      /belum selesai/,
    );
    await recordSimulationIntrusion(userA, submission);
    await expect(saveSimulation(userA, submission)).rejects.toThrow(
      /belum selesai/,
    );
    await pool.query(
      "UPDATE simulation_intrusion_timers SET started_at=now()-interval '60 seconds' WHERE attempt_id=$1",
      [submission.attemptId],
    );
    await recordSimulationIntrusion(userA, submission); // retry must not reset the clock
    await expect(recordSimulationIntrusion(userB, submission)).rejects.toThrow(
      /tidak cocok/,
    );
    await expect(saveSimulation(userB, submission)).rejects.toThrow();
    await saveSimulation(userA, submission);
    await saveSimulation(userA, submission);
    expect(
      (await readSimulationResults(userA)).filter(
        (r) => r.outcome === "failed",
      ),
    ).toHaveLength(1);
  });
});
