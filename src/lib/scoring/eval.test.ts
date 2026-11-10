import { describe, expect, it } from "@jest/globals";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import { runEval } from "@/lib/scoring/eval";
import { scoreText } from "@/lib/scoring/score";

/**
 * The eval harness exists so "we measured it" is one function call, not a
 * paragraph someone typed. These assertions pin the numbers the pitch may
 * quote; when a detector changes, the failing case names itself.
 */
describe("scoring eval — the numbers the pitch may quote", () => {
  const report = runEval();

  it("catches every scam in the corpus", () => {
    expect(report.scamTotal).toBe(60);
    expect(report.caught).toBe(report.scamTotal);
  });

  it("never calls a legitimate message risky", () => {
    expect(report.legitTotal).toBe(60);
    expect(report.legitNotRisky).toBe(report.legitTotal);
    expect(report.falsePositives).toBe(0);
  });

  it("groups catches by the modus each case expects", () => {
    expect(report.byModus.length).toBeGreaterThan(0);
    expect(report.byModus.reduce((sum, group) => sum + group.caught, 0)).toBe(
      report.classification,
    );
    expect(
      report.classification / SCAM_CASES.filter((c) => c.wantModus).length,
    ).toBeGreaterThanOrEqual(0.85);
    for (const group of report.byModus) {
      expect(group.total).toBeGreaterThan(0);
      expect(group.caught).toBeGreaterThanOrEqual(0);
      expect(group.caught).toBeLessThanOrEqual(group.total);
    }
  });

  it("stays inside the instant-verdict CPU budget per case", () => {
    console.log("EVAL", JSON.stringify(report));
    // CPU time, not wall clock: this suite runs beside 60+ others, so wall
    // clock here measures the machine's load. The engine is synchronous, so
    // its CPU cost is what the reader actually pays.
    expect(report.slowestCpuMs).toBeLessThan(50);
  });
  it("covers each family and every requested channel without network", () => {
    expect(report.byModus).toHaveLength(12);
    for (const group of report.byModus)
      expect(group.total).toBeGreaterThanOrEqual(4);
    expect(report.byStratum.reduce((n, g) => n + g.total, 0)).toBe(120);
    expect(report.missedCases).toEqual([]);
    expect(report.falsePositiveCases).toEqual([]);
    const fetchSpy = jest.fn(() => {
      throw new Error("scoring must stay offline");
    });
    const original = global.fetch;
    global.fetch = fetchSpy as unknown as typeof fetch;
    try {
      for (const c of [...SCAM_CASES, ...LEGIT_CASES])
        scoreText({ text: c.text });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = original;
    }
  });

  it("never lets two agents quote the same evidence", () => {
    for (const testCase of [...SCAM_CASES, ...LEGIT_CASES]) {
      const result = scoreText({ text: testCase.text });
      const quoted = new Map<string, string>();
      for (const signal of result.signals) {
        if (signal.weight <= 0 || !signal.evidence) continue;
        const agent = signal.agent ?? "scoring";
        /*
         * Conversation is an aggregator, not a detector: when two vectors
         * agree it deliberately quotes the setup rule's own evidence. An
         * overlap with that rule is its design, so only the owning detectors
         * are checked for duplicate quotes here.
         */
        if (agent === "conversation") continue;
        const previous = quoted.get(signal.evidence);
        expect(previous === undefined || previous === agent).toBe(true);
        quoted.set(signal.evidence, agent);
      }
    }
  });
});
