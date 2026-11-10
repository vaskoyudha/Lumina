import { describe, expect, it } from "@jest/globals";
import { CaseStore, caseMetrics, redactLog } from "@/lib/agent/case-store";
import { scoreWithTrace } from "@/lib/scoring/score";

const TEXT =
  "Akun Anda akan diblokir. Kirim kode OTP sekarang ke petugas di https://bca-verif.xyz/login";

const scored = () => scoreWithTrace({ text: TEXT });

describe("CaseStore", () => {
  it("records a hash, never the message", async () => {
    const store = new CaseStore();
    const { result, trace } = scored();
    const record = await store.record(TEXT, result, trace);
    expect(record.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(record)).not.toContain("Kirim kode OTP sekarang");
    expect(JSON.stringify(record)).not.toContain("bca-verif");
    expect(record.signals.every((s) => s.ruleId && s.mechanism)).toBe(true);
  });

  it("produces the same hash for the same text", async () => {
    const store = new CaseStore();
    const first = scored();
    const a = await store.record(TEXT, first.result, first.trace);
    const b = await store.record(TEXT, first.result, first.trace);
    expect(a.inputHash).toBe(b.inputHash);
  });

  it("keeps the summary of the validation, not the evidence", async () => {
    const store = new CaseStore();
    const { result, trace } = scored();
    const record = await store.record(TEXT, result, trace);
    expect(record.trace.validation?.verdict).toBeTruthy();
    expect(JSON.stringify(record.trace)).not.toContain("Kode OTP");
  });

  it("expires a case after 24 hours", async () => {
    const store = new CaseStore();
    const { result, trace } = scored();
    const now = Date.parse("2026-11-10T00:00:00.000Z");
    await store.record(TEXT, result, trace, now);
    expect(store.list(now + 1000)).toHaveLength(1);
    expect(store.list(now + 24 * 60 * 60 * 1000)).toHaveLength(0);
  });

  it("exports a JSON-safe record", async () => {
    const store = new CaseStore();
    const { result, trace } = scored();
    await store.record(TEXT, result, trace);
    const exported = JSON.parse(JSON.stringify(store.list()));
    expect(Array.isArray(exported)).toBe(true);
    expect(exported[0].id).toBeTruthy();
  });

  it("can be cleared", async () => {
    const store = new CaseStore();
    const { result, trace } = scored();
    await store.record(TEXT, result, trace);
    store.clear();
    expect(store.list()).toHaveLength(0);
  });
});

describe("redactLog", () => {
  it("redacts every field that could carry the message", () => {
    const redacted = redactLog({
      text: "pesan",
      evidence: "kutipan",
      question: "tanya",
      authorization: "Bearer x",
      key: "secret",
      password: "p",
      token: "t",
      secret: "s",
      nested: { text: "dalam" },
      safe: "boleh",
    }) as Record<string, unknown>;
    for (const field of [
      "text",
      "evidence",
      "question",
      "authorization",
      "key",
      "password",
      "token",
      "secret",
    ])
      expect(redacted[field]).toBe("[REDACTED]");
    expect((redacted.nested as Record<string, unknown>).text).toBe(
      "[REDACTED]",
    );
    expect(redacted.safe).toBe("boleh");
  });

  it("walks arrays", () => {
    expect(redactLog([{ text: "x" }, "y"])).toEqual([
      { text: "[REDACTED]" },
      "y",
    ]);
  });
});

describe("caseMetrics", () => {
  it("reports counts and a p95 of tool latency", async () => {
    const store = new CaseStore();
    const { result, trace } = scored();
    const withVerify = {
      ...trace,
      stages: [
        ...trace.stages,
        {
          id: "verify" as const,
          label: "Verifikasi lanjutan",
          task: "Fakta publik opsional",
          status: "gagal" as const,
          findings: 0,
          ms: 120,
        },
      ],
    };
    await store.record(TEXT, result, withVerify);
    const metrics = caseMetrics(store.list());
    expect(metrics.cases).toBe(1);
    expect(metrics.toolCalls).toBe(1);
    expect(metrics.p95Ms).toBe(120);
  });
});
