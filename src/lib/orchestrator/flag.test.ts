import {
  isOrchestratorEnabled,
  orchestratorDeadlineMs,
} from "@/lib/orchestrator/flag";

describe("isOrchestratorEnabled", () => {
  const original = process.env.LUMINA_COMPANION_ORCHESTRATOR;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.LUMINA_COMPANION_ORCHESTRATOR;
    } else {
      process.env.LUMINA_COMPANION_ORCHESTRATOR = original;
    }
  });

  it("is on by default", () => {
    delete process.env.LUMINA_COMPANION_ORCHESTRATOR;
    expect(isOrchestratorEnabled()).toBe(true);
  });

  it("treats an empty value as on", () => {
    process.env.LUMINA_COMPANION_ORCHESTRATOR = "  ";
    expect(isOrchestratorEnabled()).toBe(true);
  });

  it("accepts explicit on values", () => {
    for (const value of ["1", "true", "on", "yes", "TRUE"]) {
      process.env.LUMINA_COMPANION_ORCHESTRATOR = value;
      expect(isOrchestratorEnabled()).toBe(true);
    }
  });

  it("can be turned off explicitly", () => {
    for (const value of ["0", "false", "off", "no", "OFF"]) {
      process.env.LUMINA_COMPANION_ORCHESTRATOR = value;
      expect(isOrchestratorEnabled()).toBe(false);
    }
  });
});

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
