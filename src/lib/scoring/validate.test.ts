import { describe, expect, it } from "@jest/globals";
import type { Signal } from "@/lib/contracts/score";
import { validateSignals } from "@/lib/scoring/validate";

const signal = (over: Partial<Signal> & Pick<Signal, "label" | "weight">) =>
  ({
    evidence: over.label,
    agent: "message",
    ...over,
  }) as Signal;

describe("validateSignals", () => {
  it("collapses correlated findings into one mechanism", () => {
    const { signals, summary } = validateSignals(
      [
        signal({
          label: "Transfer ke rekening pribadi",
          weight: 0.45,
          mechanism: "payment-redirect",
          ruleId: "message.transfer",
        }),
        signal({
          label: "Rekening a.n. pribadi",
          weight: 0.35,
          mechanism: "payment-redirect",
          ruleId: "message.account",
        }),
        signal({
          label: "Top up untuk penarikan",
          weight: 0.3,
          mechanism: "payment-redirect",
          ruleId: "job-withdrawal",
        }),
      ],
      false,
    );

    expect(signals).toHaveLength(1);
    expect(signals[0].weight).toBe(0.45);
    expect(signals[0].label).toBe("Transfer ke rekening pribadi");
    expect(summary.clusters).toBe(1);
    expect(summary.rawFindings).toBe(3);
    expect(summary.topWeight).toBe(0.45);
  });

  it("keeps a single strong mechanism uncapped", () => {
    const { summary } = validateSignals(
      [
        signal({
          label: "Domain mirip BCA",
          weight: 0.55,
          agent: "link",
          mechanism: "link-deception",
          ruleId: "link.lookalike",
        }),
      ],
      false,
    );
    expect(summary.verdict).toBe("cukup");
    expect(summary.capped).toBe(false);
  });

  it("caps a single weak mechanism and says why", () => {
    const { summary } = validateSignals(
      [
        signal({
          label: "Sedikit mendesak",
          weight: 0.25,
          mechanism: "urgency-pressure",
          ruleId: "urgency",
        }),
      ],
      false,
    );
    expect(summary.verdict).toBe("tipis");
    expect(summary.capped).toBe(true);
    expect(summary.note).toMatch(/satu pola/i);
  });

  it("never caps a hard override", () => {
    const { summary } = validateSignals(
      [
        signal({
          label: "Meminta OTP",
          weight: 0.45,
          mechanism: "credential-request",
          ruleId: "otp-request",
        }),
        signal({
          label: "Akun diblokir",
          weight: 0.25,
          mechanism: "urgency-pressure",
          ruleId: "block-threat",
        }),
      ],
      true,
    );
    expect(summary.verdict).toBe("cukup");
    expect(summary.capped).toBe(false);
  });

  it("treats an official-domain match as a contradiction of a lookalike", () => {
    const evidence = "https://bca.co.id/login";
    const { signals, summary } = validateSignals(
      [
        signal({
          label: "Domain resmi",
          weight: 0.1,
          agent: "link",
          mechanism: "link-deception",
          ruleId: "link.official-domain",
          evidence,
        }),
        signal({
          label: "Domain mirip",
          weight: 0.55,
          agent: "link",
          mechanism: "link-deception",
          ruleId: "link.lookalike",
          evidence,
        }),
      ],
      false,
    );
    expect(signals).toHaveLength(0);
    expect(summary.verdict).toBe("bertentangan");
    expect(summary.capped).toBe(true);
    expect(summary.contradictions).toContain("link.lookalike");
    expect(summary.note).toMatch(/kontradiksi/i);
  });

  it("drops a rule that the same evidence already quotes as a warning", () => {
    const evidence = "Jangan pernah berikan OTP";
    const { signals, summary } = validateSignals(
      [
        signal({
          label: "Kutipan peringatan",
          weight: 0.2,
          mechanism: "urgency-pressure",
          ruleId: "message.quoted-warning",
          evidence,
        }),
        signal({
          label: "Meminta kode",
          weight: 0.4,
          mechanism: "credential-request",
          ruleId: "otp-request",
          evidence,
        }),
      ],
      false,
    );
    expect(signals).toHaveLength(0);
    expect(summary.verdict).toBe("bertentangan");
  });

  it("keeps two genuinely independent mechanisms as corroboration", () => {
    const { signals, summary } = validateSignals(
      [
        signal({
          label: "Lampiran APK",
          weight: 0.5,
          agent: "message",
          mechanism: "attachment-risk",
          ruleId: "apk",
        }),
        signal({
          label: "Akun diblokir",
          weight: 0.3,
          mechanism: "urgency-pressure",
          ruleId: "urgency",
        }),
      ],
      false,
    );
    expect(signals).toHaveLength(2);
    expect(summary.clusters).toBe(2);
    expect(summary.verdict).toBe("cukup");
    expect(signals.map((s) => s.weight)).toEqual([0.5, 0.3]);
  });

  it("ignores the weight-0 placeholder when counting findings", () => {
    const { summary } = validateSignals(
      [
        {
          label: "Tidak ada pola penipuan yang dikenali pada teks ini",
          weight: 0,
          evidence: "",
          agent: "scoring",
        },
      ],
      false,
    );
    expect(summary.rawFindings).toBe(0);
    expect(summary.clusters).toBe(0);
    expect(summary.verdict).toBe("cukup");
  });

  it("records which rule survived each cluster", () => {
    const { mapping } = validateSignals(
      [
        signal({
          label: "A",
          weight: 0.2,
          mechanism: "payment-redirect",
          ruleId: "mkt-dp",
        }),
        signal({
          label: "B",
          weight: 0.4,
          mechanism: "payment-redirect",
          ruleId: "mkt-overpayment",
        }),
      ],
      false,
    );
    expect(mapping).toEqual([
      { ruleId: "mkt-dp", keptRuleId: "mkt-overpayment" },
      { ruleId: "mkt-overpayment", keptRuleId: "mkt-overpayment" },
    ]);
  });
});
