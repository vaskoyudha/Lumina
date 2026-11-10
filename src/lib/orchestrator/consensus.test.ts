import type { AgentStatus } from "@/lib/contracts/orchestrator";
import { findConsensus } from "@/lib/orchestrator/consensus";
import type { ReportPoint } from "@/lib/orchestrator/report";

function point(
  agent: "marketplace" | "qris",
  pattern: string,
  quote = "transfer berlebih",
): ReportPoint {
  return {
    signal: "Kelebihan transfer",
    point: "Pembeli mengaku mentransfer lebih dari harga.",
    reason: "Pola kelebihan bayar.",
    pattern,
    watchout: "Jangan mengembalikan dana sebelum dana masuk.",
    quote,
  };
}

function report(
  agent: "marketplace" | "qris",
  points: ReportPoint[],
  status: AgentStatus = "selesai",
) {
  return { agent, status, points };
}

describe("findConsensus", () => {
  it("groups the same normalised pattern across distinct agents", () => {
    const groups = findConsensus([
      report("marketplace", [point("marketplace", "overpayment-refund")]),
      report("qris", [point("qris", "Overpayment  Refund")]),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern).toBe("overpayment-refund");
    expect(groups[0].agents).toEqual(["marketplace", "qris"]);
    expect(groups[0].points).toHaveLength(2);
  });

  it("ignores two points from the same agent", () => {
    expect(
      findConsensus([
        report("marketplace", [
          point("marketplace", "overpayment-refund"),
          point("marketplace", "overpayment-refund", "transfer 1,5 juta"),
        ]),
      ]),
    ).toEqual([]);
  });

  it("ignores skipped agents, different patterns, and points without a quote", () => {
    expect(
      findConsensus([
        report("marketplace", [point("marketplace", "overpayment-refund")]),
        report("qris", [point("qris", "overpayment-refund")], "dilewati"),
      ]),
    ).toEqual([]);
    expect(
      findConsensus([
        report("marketplace", [point("marketplace", "overpayment-refund")]),
        report("qris", [point("qris", "credential-request")]),
      ]),
    ).toEqual([]);
    expect(
      findConsensus([
        report("marketplace", [point("marketplace", "overpayment-refund")]),
        report("qris", [
          { ...point("qris", "overpayment-refund"), quote: undefined },
        ]),
      ]),
    ).toEqual([]);
  });

  it("sorts groups by agent count, then point count, then pattern", () => {
    const groups = findConsensus([
      report("marketplace", [point("marketplace", "zeta")]),
      report("qris", [point("qris", "zeta")]),
      report("marketplace", [point("marketplace", "alpha")]),
      report("qris", [point("qris", "alpha")]),
    ]);
    expect(groups.map((group) => group.pattern)).toEqual(["alpha", "zeta"]);
  });
});
