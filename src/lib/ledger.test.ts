import { describe, expect, it } from "@jest/globals";
import type { ScoreResult } from "@/lib/contracts/score";
import {
  clearLedger,
  configureLedger,
  entitiesIn,
  LEDGER_KEY,
  ledgerStatus,
  lookupLedger,
  recordLedger,
} from "@/lib/ledger";

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    raw: map,
  };
};

const result = (risk: ScoreResult["risk"], weight = 0.5) =>
  ({
    score: 80,
    risk,
    modus: "penipuan",
    signals: [
      { label: "Transfer", weight, evidence: "transfer", agent: "message" },
    ],
    relatedModule: null,
  }) as unknown as ScoreResult;

const TEXT =
  "Rekening: 1234567890, hubungi 0812-3456-7890, buka https://bca-verif.xyz/login";

describe("entitiesIn", () => {
  it("finds the account, the phone, the domain and the wallet", () => {
    const entities = entitiesIn(
      `${TEXT} bayar ke 0x52908400098527886E0F7030069857D2E4169EE7`,
    );
    expect(entities.map((e) => e.kind)).toEqual([
      "account",
      "phone",
      "domain",
      "wallet",
    ]);
    expect(entities.find((e) => e.kind === "domain")?.value).toBe(
      "bca-verif.xyz",
    );
  });

  it("keeps a quote for every entity so the UI can explain itself", () => {
    for (const entity of entitiesIn(TEXT)) {
      expect(entity.quote.length).toBeGreaterThan(0);
    }
  });
});

describe("ledger", () => {
  it("starts disabled and records nothing until the user opts in", async () => {
    const storage = memory();
    expect(ledgerStatus(storage).enabled).toBe(false);
    await recordLedger(storage, TEXT, result("tinggi"));
    expect(ledgerStatus(storage).count).toBe(0);
  });

  it("stores only salted hashes, never the raw entity", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(storage, TEXT, result("tinggi"));
    const raw = storage.getItem(LEDGER_KEY) ?? "";
    expect(raw).not.toContain("1234567890");
    expect(raw).not.toContain("0812");
    expect(raw).not.toContain("bca-verif.xyz");
    const parsed = JSON.parse(raw) as {
      salt: string;
      entries: { hash: string }[];
    };
    expect(parsed.salt).toMatch(/^[a-f0-9]{32}$/);
    for (const entry of parsed.entries)
      expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never records a clean message", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(storage, TEXT, result("bersih"));
    await recordLedger(storage, TEXT, result("tinggi", 0));
    expect(ledgerStatus(storage).count).toBe(0);
  });

  it("recognises the same entity on a later check", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(storage, TEXT, result("tinggi"));
    const [signal] = await lookupLedger(
      storage,
      "Transfer ke rekening 1234567890 sekarang",
    );
    expect(signal.ruleId).toBe("ledger.previous-risk");
    expect(signal.weight).toBe(0.25);
    expect(signal.evidence).toBe("1234567890");
  });

  it("does not match a different entity", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(storage, TEXT, result("tinggi"));
    expect(
      await lookupLedger(storage, "Transfer ke rekening 9876543210"),
    ).toEqual([]);
  });

  it("increments the hit count instead of duplicating the entry", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(storage, "Rekening: 1234567890", result("tinggi"));
    await recordLedger(storage, "Rekening: 1234567890", result("tinggi"));
    const parsed = JSON.parse(storage.getItem(LEDGER_KEY) ?? "{}") as {
      entries: { hits: number }[];
    };
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].hits).toBe(2);
  });

  it("caps the store at 200 entries", async () => {
    const storage = memory();
    configureLedger(storage, true);
    for (let i = 0; i < 205; i++)
      await recordLedger(
        storage,
        `Rekening: ${1000000000 + i}`,
        result("tinggi"),
      );
    expect(ledgerStatus(storage).count).toBe(200);
  });

  it("clears the entries but keeps the opt-in", async () => {
    const storage = memory();
    configureLedger(storage, true);
    await recordLedger(storage, TEXT, result("tinggi"));
    clearLedger(storage);
    expect(ledgerStatus(storage)).toEqual({ enabled: true, count: 0 });
  });

  it("ignores a corrupt store instead of crashing", async () => {
    const storage = memory();
    storage.setItem(LEDGER_KEY, "{not json");
    expect(ledgerStatus(storage)).toEqual({ enabled: false, count: 0 });
  });
});
