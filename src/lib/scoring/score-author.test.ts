import type { ConsensusGroup } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";
import { authorScore } from "@/lib/scoring/score";

const baseline: ScoreResult = {
  score: 0,
  risk: "bersih",
  signals: [
    {
      label: "Tidak ada pola penipuan yang dikenali pada teks ini",
      weight: 0,
      evidence: "pesan",
      agent: "scoring",
    },
  ],
  modus: "tidak-dikenali",
  advice: ["Tetap waspada."],
  relatedModule: null,
  hardOverride: false,
};

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

describe("authorScore", () => {
  it("uses Lumina's score, derives the band, and replaces the empty placeholder", () => {
    const result = authorScore(
      baseline,
      {
        score: 78,
        rationale: "Dua agen sepakat.",
        pointSignals: ["Kelebihan transfer"],
      },
      group,
    );

    expect(result.score).toBe(78);
    expect(result.risk).toBe("tinggi");
    expect(result.signals.some((signal) => signal.weight === 0)).toBe(false);
    expect(
      result.signals.filter((signal) => signal.source === "consensus"),
    ).toHaveLength(2);
    expect(result.modus).toBe("jual-beli-palsu");
    expect(result.relatedModule).toBe(1);
    expect(result.source).toBe("consensus");
    expect(result.baselineScore).toBe(0);
  });

  it("keeps the OTP hard floor even when Lumina scores lower", () => {
    const result = authorScore(
      { ...baseline, hardOverride: true },
      {
        score: 20,
        rationale: "Satu agen yakin, satu ragu.",
        pointSignals: ["Kelebihan transfer"],
      },
      group,
    );

    expect(result.score).toBe(70);
    expect(result.risk).toBe("tinggi");
  });
});
