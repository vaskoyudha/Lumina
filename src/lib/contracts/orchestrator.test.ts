import { OrchestratorEventSchema } from "@/lib/contracts/orchestrator";

const base = { runId: "run-1", seq: 1, at: 1 };

describe("orchestrator contract · commander", () => {
  it("parses a commander_say event", () => {
    const parsed = OrchestratorEventSchema.safeParse({
      ...base,
      type: "commander_say",
      text: "Saya melihat pola permintaan OTP. Saya akan memanggil agen yang relevan.",
      focus: "permintaan OTP",
      source: "model",
      ms: 12,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty commander announcement", () => {
    const parsed = OrchestratorEventSchema.safeParse({
      ...base,
      type: "commander_say",
      text: "",
      focus: "",
      source: "fallback",
      ms: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a one-word announcement (positive control)", () => {
    const parsed = OrchestratorEventSchema.safeParse({
      ...base,
      type: "commander_say",
      text: "ok",
      focus: "",
      source: "fallback",
      ms: 0,
    });
    expect(parsed.success).toBe(true);
  });
});
