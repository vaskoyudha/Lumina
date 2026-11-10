import type { ConsensusGroup } from "@/lib/contracts/orchestrator";
import { validateScoreDecision } from "@/lib/orchestrator/score-decision";

const group: ConsensusGroup = {
  pattern: "overpayment-refund",
  agents: ["marketplace", "qris"],
  points: [
    {
      agent: "marketplace",
      signal: "Kelebihan transfer",
      point: "Transfer berlebih.",
      pattern: "overpayment-refund",
      quote: "transfer berlebih",
    },
    {
      agent: "qris",
      signal: "Refund QRIS",
      point: "Minta refund.",
      pattern: "overpayment-refund",
      quote: "refund",
    },
  ],
};

describe("validateScoreDecision", () => {
  it("accepts a grounded free score", () => {
    expect(
      validateScoreDecision(
        {
          score: 78,
          rationale: "Dua agen menemukan klaim transfer berlebih.",
          pointSignals: ["Kelebihan transfer"],
        },
        group,
      ),
    ).toEqual({
      ok: true,
      decision: {
        score: 78,
        rationale: "Dua agen menemukan klaim transfer berlebih.",
        pointSignals: ["Kelebihan transfer"],
      },
    });
  });

  it("rejects an out-of-range score, a missing signal, and a missing consensus", () => {
    expect(
      validateScoreDecision(
        {
          score: 101,
          rationale: "Terlalu tinggi.",
          pointSignals: ["Kelebihan transfer"],
        },
        group,
      ).ok,
    ).toBe(false);
    expect(
      validateScoreDecision(
        {
          score: 78,
          rationale: "Tanpa sinyal.",
          pointSignals: ["Sinyal karangan"],
        },
        group,
      ).ok,
    ).toBe(false);
    expect(
      validateScoreDecision(
        {
          score: 78,
          rationale: "Tanpa konsensus.",
          pointSignals: ["Kelebihan transfer"],
        },
        null as never,
      ).ok,
    ).toBe(false);
  });
});
