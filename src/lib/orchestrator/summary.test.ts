import type { OrchestrationTrace } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";
import { summarizeRun } from "@/lib/orchestrator/summary";

const score = {
  score: 80,
  risk: "tinggi",
  modus: "jual-beli",
  signals: [
    {
      label: "Rekening pribadi",
      weight: 0.8,
      evidence: "transfer ke rekening saya",
      agent: "message",
      mechanism: "off-platform-payment",
    },
  ],
  advice: ["Jangan transfer ke rekening pribadi."],
  relatedModule: 1,
  hardOverride: false,
} as unknown as ScoreResult;

const trace: OrchestrationTrace = {
  runId: "run-1",
  commander: {
    text: "Saya melihat pola jual-beli. Saya akan memanggil agen.",
    source: "model",
    ms: 10,
  },
  planner: {
    rationale: "Pesan meminta transfer ke rekening pribadi.",
    agents: [],
    source: "model",
    ms: 5,
  },
  agents: [
    {
      id: "marketplace",
      label: "Marketplace Agent",
      task: "Periksa rekening pribadi.",
      skills: ["marketplace"],
      tools: ["score_message"],
      status: "selesai",
      summary: "Pesan meminta transfer ke rekening pribadi.",
      points: [
        {
          signal: "Rekening pribadi",
          point: "Transfer ke rekening pribadi.",
          reason: "Marketplace resmi menahan dana.",
          pattern: "off-platform-payment",
          watchout: "Jangan transfer.",
          quote: "transfer ke rekening saya",
        },
      ],
      ms: 120,
    },
  ],
  synthesis: "Pesan ini berisiko tinggi.",
  totalMs: 200,
  degraded: false,
};

describe("summarizeRun", () => {
  it("keeps structure and drops every content field", () => {
    const summary = summarizeRun(trace, score);
    const serialized = JSON.stringify(summary);

    expect(serialized).not.toContain("transfer ke rekening saya");
    expect(serialized).not.toContain("Pesan meminta transfer");
    expect(serialized).not.toContain("Saya melihat pola");
    expect(serialized).not.toContain("Pesan ini berisiko");
    expect(serialized).not.toContain("Jangan transfer");
    expect(Object.keys(summary).sort()).toEqual([
      "agents",
      "band",
      "modus",
      "plannerSource",
      "runId",
      "totalMs",
    ]);
    expect(Object.keys(summary.agents[0]).sort()).toEqual([
      "id",
      "label",
      "ms",
      "status",
    ]);
    expect(summary).toMatchObject({
      runId: "run-1",
      modus: "jual-beli",
      band: "tinggi",
      totalMs: 200,
    });
  });
});
