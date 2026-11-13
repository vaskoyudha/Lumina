import { buildSpawnLedger } from "@/components/companion/spawn-ledger";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";

const base = (seq: number) => ({ runId: "run-1", seq, at: seq });

const started = (
  seq: number,
  agent: "message" | "link" | "conversation",
  task = `Tugas ${agent}`,
): OrchestratorEvent => ({
  ...base(seq),
  type: "agent_start",
  agent,
  label: `${agent} label`,
  task,
  skills: [],
  tools: [],
});

const result = (
  seq: number,
  agent: "message" | "link" | "conversation",
  status: "selesai" | "gagal" | "dilewati",
  findings = 0,
): OrchestratorEvent => ({
  ...base(seq),
  type: "agent_result",
  agent,
  label: `${agent} label`,
  status,
  summary: "",
  findings: Array.from({ length: findings }, (_, index) => `finding ${index}`),
  points: [],
  ms: 12,
});

describe("buildSpawnLedger", () => {
  it("returns only started agents, in spawn order", () => {
    const ledger = buildSpawnLedger([
      started(1, "message"),
      started(2, "link"),
      result(3, "link", "selesai", 2),
    ]);

    expect(ledger.map((agent) => agent.agent)).toEqual(["message", "link"]);
    expect(ledger[1]).toMatchObject({
      status: "selesai",
      findings: 2,
      ms: 12,
    });
  });

  it("keeps a start without a result as running", () => {
    const ledger = buildSpawnLedger([started(1, "conversation")]);

    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.status).toBe("berjalan");
  });

  it("ignores a result for an agent that never started", () => {
    const ledger = buildSpawnLedger([result(1, "link", "selesai")]);

    expect(ledger).toEqual([]);
  });

  it("carries a skipped result instead of hiding it", () => {
    const ledger = buildSpawnLedger([
      started(1, "link"),
      result(2, "link", "dilewati"),
    ]);

    expect(ledger[0]?.status).toBe("dilewati");
  });

  it("returns an empty list without events", () => {
    expect(buildSpawnLedger(undefined)).toEqual([]);
    expect(buildSpawnLedger(null)).toEqual([]);
    expect(buildSpawnLedger([])).toEqual([]);
  });
});
