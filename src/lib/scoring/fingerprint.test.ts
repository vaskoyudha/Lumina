import { describe, expect, it } from "@jest/globals";
import { SCAM_TEMPLATES } from "@/data/scam-templates";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import {
  closestCampaign,
  fingerprintSignals,
  jaccard,
  shingles,
} from "@/lib/scoring/fingerprint";
import { normalizeWithMap } from "@/lib/scoring/normalize";

describe("fingerprint", () => {
  it("measures overlap between two shingle sets", () => {
    expect(jaccard(shingles("abcdefghij"), shingles("abcdefghij"))).toBe(1);
    expect(jaccard(shingles("abcdefghij"), shingles("zzzzzzzzzz"))).toBe(0);
    expect(jaccard(new Set(), shingles("abcdefghij"))).toBe(0);
  });

  it("fires on a paraphrase of a stored campaign", () => {
    const text =
      "Saya dari bagian keamanan bank. Tolong sebutkan kode verifikasi yang masuk ke ponsel agar pembatalan transaksi dapat dilakukan.";
    const [signal] = fingerprintSignals(text);
    expect(signal).toBeTruthy();
    expect(signal.weight).toBe(0.3);
    expect(signal.ruleId).toMatch(/^fingerprint\./);
  });

  it("stays below the threshold for an unrelated message", () => {
    const text = "Selamat sore, jadwal rapat dipindah ke hari Kamis pukul 10.";
    expect(fingerprintSignals(text)).toHaveLength(0);
  });

  it("does not fire on a warning that quotes a campaign", () => {
    const text =
      "Waspada penipuan! Sebutkan kode verifikasi yang masuk ke ponsel agar pembatalan transaksi bisa dilakukan adalah modus yang sering dilaporkan.";
    expect(fingerprintSignals(text)).toHaveLength(0);
  });

  it("names the closest campaign for debugging", () => {
    expect(closestCampaign("Halo, apa kabar?")).toBeNull();
  });

  it("keeps every stored template out of the benchmark verbatim", () => {
    const bench = [...SCAM_CASES, ...LEGIT_CASES].map(
      (c) => normalizeWithMap(c.text).text,
    );
    for (const [id, , template] of SCAM_TEMPLATES) {
      const normalized = normalizeWithMap(template).text;
      for (const text of bench) expect(text.includes(normalized)).toBe(false);
      expect(id.length).toBeGreaterThan(2);
    }
  });
});
