import { filterPostings } from "@/lib/loker/search";
import type { LokerView } from "@/lib/loker/types";

function posting(over: Partial<LokerView> = {}): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: 10_000_000,
    salaryMax: 15_000_000,
    salaryText: "Rp10-15 jt",
    tags: ["React"],
    description: "Membangun antarmuka React.",
    applyUrl: "https://example.com/1",
    source: "Jobstreet",
    postedAt: "2026-11-01",
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
    ...over,
  };
}

describe("filterPostings", () => {
  it("requires every query term (AND, not OR)", () => {
    const rows = [
      posting(),
      posting({
        urlKey: "2",
        title: "Backend Engineer",
        description: "Go.",
        tags: ["Go"],
      }),
    ];
    expect(
      filterPostings(rows, { query: "React Jakarta" }).map((r) => r.urlKey),
    ).toEqual(["https://example.com/1"]);
  });

  it("matches location from the location field, not the prose", () => {
    const rows = [posting(), posting({ urlKey: "2", location: "Bandung" })];
    expect(
      filterPostings(rows, { query: "engineer", location: "Jakarta" }),
    ).toHaveLength(1);
  });

  it("passes postings with no salary when a band is requested", () => {
    const rows = [
      posting({ salaryMin: null, salaryMax: null, salaryText: null }),
    ];
    expect(
      filterPostings(rows, { query: "engineer", salaryMin: 8_000_000 }),
    ).toHaveLength(1);
  });

  it("drops a posting entirely below the requested band", () => {
    const rows = [posting({ salaryMin: 3_000_000, salaryMax: 5_000_000 })];
    expect(
      filterPostings(rows, { query: "engineer", salaryMin: 8_000_000 }),
    ).toHaveLength(0);
  });

  it("hideFlagged drops either verdict's caution", () => {
    const rows = [
      posting(),
      posting({ urlKey: "2", sentinelStatus: "suspicious" }),
      posting({ urlKey: "3", luminaRisk: "mencurigakan" }),
    ];
    expect(
      filterPostings(rows, { query: "", hideFlagged: true }).map(
        (r) => r.urlKey,
      ),
    ).toEqual(["https://example.com/1"]);
  });

  it("an empty query keeps the corpus order", () => {
    const rows = [posting({ urlKey: "a" }), posting({ urlKey: "b" })];
    expect(filterPostings(rows, { query: "" }).map((r) => r.urlKey)).toEqual([
      "a",
      "b",
    ]);
  });
});
