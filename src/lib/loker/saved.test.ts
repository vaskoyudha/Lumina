import { loadSaved, removeSaved, toggleSaved } from "@/lib/loker/saved";
import type { LokerView } from "@/lib/loker/types";

function posting(over: Partial<LokerView> = {}): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: "Rp10-15 jt",
    tags: [],
    description: "Membangun antarmuka.",
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
    ...over,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("saved postings", () => {
  it("adds then removes a snapshot by url key", () => {
    const afterAdd = toggleSaved(posting());
    expect(afterAdd).toHaveLength(1);
    expect(afterAdd[0]).toMatchObject({
      id: "https://example.com/1",
      title: "Frontend Engineer",
      sentinelStatus: "clean",
      luminaRisk: "bersih",
    });
    expect(loadSaved()).toHaveLength(1);

    const afterRemove = toggleSaved(posting());
    expect(afterRemove).toEqual([]);
    expect(loadSaved()).toEqual([]);
  });

  it("removes by id", () => {
    toggleSaved(posting());
    removeSaved("https://example.com/1");
    expect(loadSaved()).toEqual([]);
  });

  it("ignores malformed storage instead of throwing", () => {
    window.localStorage.setItem("lumina-saved-loker", "{not json");
    expect(loadSaved()).toEqual([]);
    window.localStorage.setItem(
      "lumina-saved-loker",
      JSON.stringify([{ id: 1 }]),
    );
    expect(loadSaved()).toEqual([]);
  });

  it("keeps the newest save first", () => {
    toggleSaved(posting({ urlKey: "https://example.com/a", title: "A" }));
    toggleSaved(posting({ urlKey: "https://example.com/b", title: "B" }));
    expect(loadSaved().map((item) => item.title)).toEqual(["B", "A"]);
  });
});
