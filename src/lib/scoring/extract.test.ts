import { describe, expect, it } from "@jest/globals";
import { extractEntities, extractedSignals } from "@/lib/scoring/extract";

describe("extractEntities", () => {
  it("reads a transfer receipt", () => {
    const text = [
      "Pengirim: Toko Sumber Rejeki",
      "Rekening: 1234567890",
      "Total Rp1.500.000",
      "1 Januari 2026 10:30",
    ].join("\n");
    const entities = extractEntities(text);
    expect(entities.sender).toBe("Toko Sumber Rejeki");
    expect(entities.account).toBe("1234567890");
    expect(entities.amount).toEqual({ value: 1500000, currency: "IDR" });
    expect(entities.timestamp).toContain("1 Januari 2026");
    expect(entities.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("repairs OCR noise in an amount", () => {
    expect(extractEntities("Total Rp1OO.OOO sudah dibayar").amount).toEqual({
      value: 100000,
      currency: "IDR",
    });
  });

  it("reads a phone number and a link from a chat screenshot", () => {
    const entities = extractEntities(
      "Hubungi 0812-3456-7890 atau buka https://bca-verif.xyz/login",
    );
    expect(entities.phone).toContain("0812");
    expect(entities.url).toBe("https://bca-verif.xyz/login");
    expect(entities.account).toBeUndefined();
    expect(entities.amount).toBeUndefined();
  });

  it("reports low confidence instead of guessing", () => {
    const entities = extractEntities("Halo, besok kita bertemu ya.");
    expect(entities.confidence).toBe(0);
    expect(entities.amount).toBeUndefined();
    expect(entities.account).toBeUndefined();
  });
});

describe("extractedSignals", () => {
  it("speaks up when an amount and an account arrive together", () => {
    const [signal] = extractedSignals(
      "Rekening: 1234567890\nTotal Rp1.500.000",
    );
    expect(signal.weight).toBe(0.2);
    expect(signal.ruleId).toBe("evidence.amount-account");
    expect(signal.mechanism).toBe("payment-redirect");
    expect(signal.evidence).toBe("1234567890");
  });

  it("stays quiet when only one of the two is present", () => {
    expect(extractedSignals("Total Rp1.500.000 sudah dibayar")).toHaveLength(0);
    expect(extractedSignals("Rekening: 1234567890")).toHaveLength(0);
  });
});
