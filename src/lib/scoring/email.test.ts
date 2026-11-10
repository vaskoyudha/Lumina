import { describe, expect, it } from "@jest/globals";
import { emailSignals, parseEmailHeaders } from "@/lib/scoring/email";

const headers = (lines: string[]) => lines.join("\r\n");

const weights = (text: string) =>
  emailSignals(text).signals.map((s) => s.weight);

describe("email header detector", () => {
  it("parses a folded header block", () => {
    const parsed = parseEmailHeaders(
      headers(["From: Bank BCA <cs@bca.co.id>", "Subject: Reset", " folded"]),
    );
    expect(parsed.get("from")).toBe("Bank BCA <cs@bca.co.id>");
    expect(parsed.get("subject")).toContain("folded");
  });

  it("skips body-only text with an honest note", () => {
    const result = emailSignals("Halo, paket Anda sudah dikirim ya.");
    expect(result.signals).toHaveLength(0);
    expect(result.note).toMatch(/bukan blok header/i);
  });

  it("flags SPF, DKIM and DMARC failures with their own weights", () => {
    const text = headers([
      "Authentication-Results: mx.google.com; spf=fail; dkim=fail; dmarc=fail",
      "From: Bank BCA <cs@bca.co.id>",
      "Subject: Verifikasi",
    ]);
    expect(weights(text)).toEqual([0.35, 0.35, 0.45]);
    expect(emailSignals(text).signals.map((s) => s.ruleId)).toEqual([
      "email.spf",
      "email.dkim",
      "email.dmarc",
    ]);
  });

  it("stays silent when the pasted header says authentication passed", () => {
    const text = headers([
      "Authentication-Results: mx.google.com; spf=pass; dkim=pass; dmarc=pass",
      "From: Bank BCA <cs@bca.co.id>",
      "Subject: Verifikasi",
    ]);
    const result = emailSignals(text);
    expect(result.signals).toHaveLength(0);
    expect(result.note).toMatch(/bukan verifikasi/i);
  });

  it("flags a display name that claims a brand on another domain", () => {
    const text = headers([
      "From: Bank BCA <cs@bca-verif.xyz>",
      "Subject: Akun diblokir",
    ]);
    const [signal] = emailSignals(text).signals;
    expect(signal.weight).toBe(0.5);
    expect(signal.ruleId).toBe("email.display-spoof");
    expect(signal.mechanism).toBe("authority-claim");
  });

  it("flags a Reply-To that redirects the reply", () => {
    const text = headers([
      "From: Bank BCA <cs@bca.co.id>",
      "Reply-To: admin@evil.example",
      "Subject: Verifikasi",
    ]);
    expect(weights(text)).toContain(0.3);
  });

  it("flags an envelope that differs from From", () => {
    const text = headers([
      "From: Bank BCA <cs@bca.co.id>",
      "Return-Path: <bounce@mailer.example>",
      "Subject: Verifikasi",
    ]);
    const signal = emailSignals(text).signals.find(
      (s) => s.ruleId === "email.return-path",
    );
    expect(signal?.weight).toBe(0.2);
  });

  it("does not crash on a malformed block", () => {
    const text = headers(["From:", "Authentication-Results:", "::::"]);
    expect(() => emailSignals(text)).not.toThrow();
  });

  it("keeps every quote inside the pasted headers", () => {
    const text = headers([
      "Authentication-Results: spf=fail",
      "From: Bank BCA <cs@bca-verif.xyz>",
      "Subject: Verifikasi",
    ]);
    for (const signal of emailSignals(text).signals) {
      expect(text).toContain(signal.evidence);
      expect(signal.mechanism).toBeTruthy();
    }
  });
});
