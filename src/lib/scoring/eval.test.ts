import { describe, expect, it } from "@jest/globals";
import { runEval } from "@/lib/scoring/eval";

/**
 * The eval harness exists so "we measured it" is one function call, not a
 * paragraph someone typed. These assertions pin the numbers the pitch may
 * quote; when a detector changes, the failing case names itself.
 */
describe("scoring eval — the numbers the pitch may quote", () => {
  const report = runEval();

  it("catches every scam in the corpus", () => {
    expect(report.scamTotal).toBe(20);
    expect(report.caught).toBe(report.scamTotal);
  });

  it("never calls a legitimate message risky", () => {
    expect(report.legitTotal).toBe(25);
    expect(report.legitNotRisky).toBe(report.legitTotal);
    expect(report.falsePositives).toBe(0);
  });

  it("groups catches by the modus each case expects", () => {
    expect(report.byModus.length).toBeGreaterThan(0);
    expect(report.byModus.reduce((sum, group) => sum + group.caught, 0)).toBe(
      report.classification,
    );
    expect(report.classification).toBeGreaterThanOrEqual(15);
    for (const group of report.byModus) {
      expect(group.total).toBeGreaterThan(0);
      expect(group.caught).toBeGreaterThanOrEqual(0);
      expect(group.caught).toBeLessThanOrEqual(group.total);
    }
  });

  it("stays inside the instant-verdict CPU budget per case", () => {
    // CPU time, not wall clock: this suite runs beside 60+ others, so wall
    // clock here measures the machine's load. The engine is synchronous, so
    // its CPU cost is what the reader actually pays.
    expect(report.slowestCpuMs).toBeLessThan(50);
  });
});
