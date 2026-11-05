import { describe, expect, it } from "@jest/globals";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import { scoreText, scoreWithTrace } from "@/lib/scoring/score";

const SCAM =
  "Akun Anda akan diblokir dalam 2 jam. Verifikasi di " +
  "https://bca-verif.xyz/login sebelum ditutup.";

describe("scoreWithTrace", () => {
  it("reports every detector stage plus scoring", () => {
    const { trace } = scoreWithTrace({ text: SCAM });
    const ids = trace.stages.map((stage) => stage.id);

    expect(ids).toEqual([
      "message",
      "link",
      "identity",
      "conversation",
      "scoring",
    ]);
    for (const stage of trace.stages) {
      expect(stage.ms).toBeGreaterThanOrEqual(0);
      expect(stage.label.length).toBeGreaterThan(0);
    }
    expect(trace.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("attributes each surviving signal to exactly one stage", () => {
    const { result, trace } = scoreWithTrace({ text: SCAM });
    const counted = trace.stages.reduce((sum, stage) => sum + stage.findings, 0);
    // The orchestrator produces no findings of its own; only detectors do.
    expect(counted).toBe(result.signals.length);
  });

  it("is a measurement, never a score", () => {
    for (const benchCase of SCAM_CASES) {
      expect(scoreWithTrace({ text: benchCase.text }).result).toEqual(
        scoreText({ text: benchCase.text }),
      );
    }
    for (const benchCase of LEGIT_CASES) {
      expect(scoreWithTrace({ text: benchCase.text }).result).toEqual(
        scoreText({ text: benchCase.text }),
      );
    }
  });

  it("notes why a stage had nothing to do rather than claiming a clean pass", () => {
    const { trace } = scoreWithTrace({ text: "Halo, apa kabar?" });
    const link = trace.stages.find((stage) => stage.id === "link");
    expect(link?.status).toBe("dilewati");
    expect(link?.note).toMatch(/tautan/i);
  });
});
