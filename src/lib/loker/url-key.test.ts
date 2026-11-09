/**
 * url-key.ts mirrors engine/url-key.mjs's `normalizeUrl`. These tests pin the
 * mirror to the engine's documented behaviour, so a drift between the two — the
 * silent disagreement career-ops' web/AGENTS.md warns about — fails here.
 *
 * The engine itself is not imported (it is a vendored .mjs tree outside the
 * build graph); these are the same cases its own url-key module encodes.
 */
import { normalisasiKunciUrl } from "@/lib/loker/url-key";

describe("normalisasiKunciUrl (parity with engine/url-key.mjs normalizeUrl)", () => {
  it("returns empty string for non-URL input", () => {
    expect(normalisasiKunciUrl("")).toBe("");
    expect(normalisasiKunciUrl(null)).toBe("");
    expect(normalisasiKunciUrl("N/A")).toBe("");
    expect(normalisasiKunciUrl("local:jds/foo.pdf")).toBe("");
    expect(normalisasiKunciUrl("mailto:hr@example.com")).toBe("");
  });

  it("lowercases the host and forces https", () => {
    expect(normalisasiKunciUrl("HTTP://Example.COM/jobs/1")).toBe(
      "https://example.com/jobs/1",
    );
  });

  it("drops a single trailing slash on a path but never the root", () => {
    expect(normalisasiKunciUrl("https://example.com/jobs/1/")).toBe(
      "https://example.com/jobs/1",
    );
    expect(normalisasiKunciUrl("https://example.com/")).toBe(
      "https://example.com/",
    );
  });

  it("strips tracking params and keeps functional ones, sorted", () => {
    expect(
      normalisasiKunciUrl(
        "https://a.co/jobs/1?utm_source=x&gh_jid=42&fbclid=1",
      ),
    ).toBe("https://a.co/jobs/1?gh_jid=42");
  });

  it("does NOT strip generic names like ref or source", () => {
    expect(
      normalisasiKunciUrl("https://a.co/jobs/1?ref=home&source=search"),
    ).toBe("https://a.co/jobs/1?ref=home&source=search");
  });

  it("drops unrecognized fragments", () => {
    expect(normalisasiKunciUrl("https://a.co/jobs/1#section")).toBe(
      "https://a.co/jobs/1",
    );
  });
});
