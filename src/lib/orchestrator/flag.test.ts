import { orchestratorDeadlineMs } from "@/lib/orchestrator/flag";

describe("orchestratorDeadlineMs", () => {
  const original = process.env.LUMINA_ORCHESTRATOR_DEADLINE_MS;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.LUMINA_ORCHESTRATOR_DEADLINE_MS;
    } else {
      process.env.LUMINA_ORCHESTRATOR_DEADLINE_MS = original;
    }
  });

  it("defaults to 120 seconds for serial runs", () => {
    delete process.env.LUMINA_ORCHESTRATOR_DEADLINE_MS;
    expect(orchestratorDeadlineMs()).toBe(120_000);
  });

  it("accepts values inside the clamp", () => {
    process.env.LUMINA_ORCHESTRATOR_DEADLINE_MS = "90000";
    expect(orchestratorDeadlineMs()).toBe(90_000);
  });

  it("rejects values above the new ceiling", () => {
    process.env.LUMINA_ORCHESTRATOR_DEADLINE_MS = "999999";
    expect(orchestratorDeadlineMs()).toBe(120_000);
  });
});
