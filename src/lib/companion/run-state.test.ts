import { runSettled } from "@/lib/companion/run-state";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";

const event = (
  value: Partial<OrchestratorEvent> & { type: OrchestratorEvent["type"] },
) => value as OrchestratorEvent;

describe("runSettled", () => {
  it("treats a turn without orchestration as settled", () => {
    expect(runSettled(undefined)).toBe(true);
    expect(runSettled([])).toBe(true);
  });

  it("is not settled while only a plan has arrived", () => {
    expect(runSettled([event({ type: "run_start" })])).toBe(false);
    expect(runSettled([event({ type: "commander_say" })])).toBe(false);
  });

  it("settles at synthesis_end or done", () => {
    expect(runSettled([event({ type: "synthesis_end" })])).toBe(true);
    expect(runSettled([event({ type: "done" })])).toBe(true);
  });

  it("settles an aborted run that ends in an error", () => {
    expect(
      runSettled([event({ type: "plan" }), event({ type: "error" })]),
    ).toBe(true);
  });
});
