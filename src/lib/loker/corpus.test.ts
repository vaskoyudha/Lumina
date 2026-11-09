import { CORPUS_LIMIT, capCorpus } from "@/lib/loker/corpus";
import type { LokerView } from "@/lib/loker/types";

function posting(i: number): LokerView {
  return {
    urlKey: `https://example.com/${i}`,
    title: `Lowongan ${i}`,
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: null,
    tags: [],
    description: "x".repeat(100),
    applyUrl: null,
    source: "Jobstreet",
    postedAt: null,
    fetchedAt: "2026-11-09T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
  };
}

describe("capCorpus", () => {
  it("keeps the newest order and reports the honest total", () => {
    const rows = Array.from({ length: 5 }, (_, i) => posting(i));
    const out = capCorpus(rows, 5);
    expect(out.postings.map((row) => row.urlKey)).toEqual([
      "https://example.com/0",
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
      "https://example.com/4",
    ]);
    expect(out.total).toBe(5);
    expect(out.capped).toBe(false);
  });

  it("lowers the cap to stay inside the serialization budget", () => {
    const rows = Array.from({ length: 5 }, (_, i) => posting(i));
    const one = new TextEncoder().encode(JSON.stringify(rows[0])).byteLength;
    const out = capCorpus(rows, 5, one * 2 + 10);
    expect(out.postings).toHaveLength(2);
    expect(out.total).toBe(5);
    expect(out.capped).toBe(true);
  });

  it("never returns more than CORPUS_LIMIT", () => {
    const rows = Array.from({ length: CORPUS_LIMIT + 5 }, (_, i) => posting(i));
    const out = capCorpus(rows, rows.length, Number.MAX_SAFE_INTEGER);
    expect(out.postings).toHaveLength(CORPUS_LIMIT);
    expect(out.capped).toBe(true);
  });
});
