import { describe, expect, it } from "@jest/globals";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import {
  annotateSignal,
  MECHANISMS,
  type MechanismId,
} from "@/lib/scoring/mechanism";
import { scoreText } from "@/lib/scoring/score";

describe("mechanism taxonomy", () => {
  it("has unique ids", () => {
    expect(new Set(MECHANISMS).size).toBe(MECHANISMS.length);
  });

  it("keeps an explicit mechanism", () => {
    const annotated = annotateSignal({
      label: "x",
      weight: 0.4,
      evidence: "x",
      agent: "message",
      mechanism: "reward-lure",
      ruleId: "message.prize",
    });
    expect(annotated.mechanism).toBe("reward-lure");
  });

  it("maps a known rule id", () => {
    const annotated = annotateSignal({
      label: "Deposit administrasi",
      weight: 0.4,
      evidence: "deposit",
      agent: "job",
      ruleId: "job-admin-deposit",
    });
    expect(annotated.mechanism).toBe("payment-redirect");
  });

  it("falls back by agent, not by guesswork", () => {
    expect(
      annotateSignal({
        label: "Domain mirip",
        weight: 0.5,
        evidence: "bca-verif.xyz",
        agent: "link",
        ruleId: "link.unknown",
      }).mechanism,
    ).toBe("link-deception");
    expect(
      annotateSignal({
        label: "Pola bertahap",
        weight: 0.4,
        evidence: "x",
        agent: "conversation",
        ruleId: "conversation.staged",
      }).mechanism,
    ).toBe("escalation");
    expect(
      annotateSignal({
        label: "Nomor asing",
        weight: 0.3,
        evidence: "+44 7...",
        agent: "identity",
        ruleId: "identity.foreign-claim",
      }).ruleId,
    ).toBe("identity.foreign-claim");
  });

  it("gives every weighted bench signal a mechanism and a rule id", () => {
    for (const benchCase of [...SCAM_CASES, ...LEGIT_CASES]) {
      const result = scoreText({ text: benchCase.text });
      for (const signal of result.signals) {
        if (signal.weight <= 0) continue;
        expect(signal.mechanism).toBeTruthy();
        expect(MECHANISMS).toContain(signal.mechanism as MechanismId);
        expect(signal.ruleId).toBeTruthy();
        expect(signal.ruleId).toMatch(/^[a-z-]+\.[a-z0-9-]+$/);
      }
    }
  });
});
