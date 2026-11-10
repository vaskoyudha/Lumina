import { normalizeWithMap, originalSpan } from "@/lib/scoring/normalize";

const lower = (input: string) => normalizeWithMap(input).text;

describe("normalizeWithMap", () => {
  it("lowercases and leaves clean text otherwise untouched", () => {
    expect(lower("Halo, apa kabar?")).toBe("halo, apa kabar?");
  });

  it("joins a word split by dots", () => {
    expect(lower("t.r.a.n.s.f.e.r sekarang")).toContain("transfer");
  });

  it("joins a word split by spaces", () => {
    expect(lower("t r a n s f e r sekarang")).toContain("transfer");
  });

  it("joins a word split by symbols", () => {
    expect(lower("k*i*r*i*m sekarang")).toContain("kirim");
  });

  it("removes zero-width characters", () => {
    expect(lower("b\u200Bc\u200Ca")).toBe("bca");
  });

  it("folds leetspeak inside a sensitive token only", () => {
    const normalized = lower("tr4nsf3r ke rekening 1234567890");
    expect(normalized).toContain("transfer");
    // The account number is not a sensitive token, so it survives verbatim.
    expect(normalized).toContain("1234567890");
  });

  it("never folds a currency amount into letters", () => {
    expect(lower("Rp100.000")).toBe("rp100.000");
    expect(lower("transfer Rp1.500.000")).toContain("rp1.500.000");
  });

  it("keeps evidence a verbatim slice of the original input", () => {
    const input = "Mohon t.r.a.n.s.f.e.r sekarang juga";
    const normalized = normalizeWithMap(input);
    const start = normalized.text.indexOf("transfer");
    expect(start).toBeGreaterThanOrEqual(0);
    const [from, to] = originalSpan(
      normalized,
      start,
      start + "transfer".length,
    );
    const evidence = input.slice(from, to);
    expect(input).toContain(evidence);
    expect(evidence.length).toBeGreaterThan(0);
  });

  it("is idempotent on already-normalised text", () => {
    const once = lower("Transfer sekarang ke rekening BCA");
    expect(lower(once)).toBe(once);
  });
});
