import { describe, expect, it } from "@jest/globals";
import type { ScoreResult } from "@/lib/contracts/score";
import { configureLedger, recordLedger } from "@/lib/ledger";
import { accountReputation } from "@/lib/verify/account";
import { phonePrefix, phoneReputation } from "@/lib/verify/phone";

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
};

const risky = {
  score: 80,
  risk: "tinggi",
  modus: "penipuan",
  signals: [
    {
      label: "Transfer ke rekening pribadi",
      weight: 0.5,
      evidence: "transfer",
      agent: "message",
    },
  ],
  relatedModule: null,
} as unknown as ScoreResult;

describe("phonePrefix", () => {
  it("reads an Indonesian mobile prefix without claiming the owner", () => {
    const prefix = phonePrefix("0812-3456-7890");
    expect(prefix.kind).toBe("indonesia");
    expect(prefix.prefix).toBe("0812");
    expect(prefix.note).toMatch(/tidak diverifikasi/i);
  });

  it("accepts the +62 form", () => {
    expect(phonePrefix("+62 812 3456 7890").kind).toBe("indonesia");
  });

  it("recognises a shortcode", () => {
    expect(phonePrefix("1500888").kind).toBe("shortcode");
  });

  it("refuses to conclude anything from a foreign number", () => {
    const prefix = phonePrefix("+44 7700 900123");
    expect(prefix.kind).toBe("foreign-or-unknown");
    expect(prefix.prefix).toBeNull();
  });
});

describe("phoneReputation", () => {
  it("says there is no report instead of saying the number is safe", async () => {
    const result = await phoneReputation("0812-3456-7890", memory());
    expect(result.status).toBe("Belum ada laporan");
    expect(result.source).toBe("Riwayat perangkat ini");
  });

  it("reports a number that this device already saw in a risky check", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(storage, "Hubungi 0812-3456-7890 sekarang", risky);
    const result = await phoneReputation("0812-3456-7890", storage);
    expect(result.status).toBe("Pernah dilaporkan di perangkat ini");
  });
});

describe("accountReputation", () => {
  it("states plainly that CekRekening.id is not connected", async () => {
    const result = await accountReputation("1234567890", memory());
    expect(result.reported).toBe(false);
    expect(result.note).toMatch(/CekRekening\.id/i);
    expect(result.note).toMatch(/bukan pemeriksaan rekening nasional/i);
  });

  it("finds an account this device already saw in a risky check", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(
      storage,
      "Rekening: 1234567890\nTotal Rp1.500.000",
      risky,
    );
    const result = await accountReputation("1234567890", storage);
    expect(result.reported).toBe(true);
    expect(result.status).toBe("Pernah dilaporkan di perangkat ini");
  });
});
