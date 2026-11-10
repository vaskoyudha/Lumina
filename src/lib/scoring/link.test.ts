import { describe, expect, it } from "@jest/globals";

import { classifyLink, linkSignals } from "./link";

/**
 * Regression evidence for the false-positive / missed-catch analysis of
 * 5 Nov 2026. Three of these were LIVE engine defects measured on the
 * 40-message bench and its defect probes:
 *
 *   a. `kampus.ac.id` scored as a typosquat — the old parse sent
 *      host="kampus.ac.id" through slice(-2) to registrable "ac.id", whose
 *      "SLD" was literally "ac", 2 edits away from "bca".
 *   b. The .co.id/.ac.id allowlist never fired for the same reason.
 *   c. `sh0pee-verif.com` fell through as "unknown": distance from
 *      "shopee" on the raw SLD is 6, and the shortener check ran first.
 */
describe("link classification — measured defect regressions", () => {
  it("a: kampus.ac.id is NOT a typosquat (was: imitated 'bca')", () => {
    const f = classifyLink("kampus.ac.id/penerimaan");
    expect(f).not.toBeNull();
    expect(f?.kind).not.toBe("typosquat");
  });

  it("b: allowlist fires for multi-part suffixes it owns", () => {
    expect(classifyLink("https://www.bca.co.id/solat")?.kind).toBe("official");
    expect(classifyLink("https://unnes.ac.id/dikti")?.kind).toBe("official");
    expect(classifyLink("https://pajak.go.id/" as string)?.kind).toBe(
      "official",
    );
  });

  it("c: sh0pee-verif.com is caught as brand impersonation", () => {
    const f = classifyLink("https://sh0pee-verif.com/klaim");
    expect(f?.kind).toBe("typosquat");
    expect(f?.imitates).toBe("Shopee");
  });

  it("d: appended fake of an official domain is caught even at distance>2", () => {
    expect(classifyLink("tokopedia-aman3.xyz")?.kind).toBe("typosquat");
  });

  it("e: shortener stays shortener; destination unknown to the eye", () => {
    // A shortener hides its destination, so the brand claim inside the path
    // can never be checked — the honest finding is the shortener one.
    expect(classifyLink("https://bit.ly/bca-verif")?.kind).toBe("shortener");
  });

  it("f: subdomain of an official domain is official; sibling is not", () => {
    expect(classifyLink("karir.polri.go.id/masuk")?.kind).toBe("official");
    expect(classifyLink("polri-aman.xyz/karir")?.kind).toBe("typosquat");
  });

  it("g: 3-letter brands use the prefix rule (bca → bcamobile)", () => {
    expect(classifyLink("bcam0bile.co.id")?.kind).toBe("typosquat");
    expect(classifyLink("bcaverifikasi.co.id")?.kind).toBe("typosquat");
    // Documented limitation: 3-letter brands never match on "contains",
    // because "bca" sits inside innocent words like "herbal". Appended
    // fakes are covered (above), infixed ones are not.
    expect(classifyLink("hellobcash.my.id")?.kind).not.toBe("typosquat");
  });
});

describe("link classification — the exact brand SLD on the wrong suffix", () => {
  it("flags bca.com as an imitation of BCA", () => {
    // Measured defect: the imitation resolver declined when the normalized SLD
    // equalled the brand, on the assumption that equality meant "the official
    // path". The official check runs first, so by this point equality can only
    // mean the brand name bought on a suffix the brand does not own.
    const f = classifyLink("bca.com");
    expect(f?.kind).toBe("typosquat");
    expect(f?.imitates).toBe("BCA");
  });

  it("still resolves the real registrable before the imitation pass", () => {
    expect(classifyLink("bca.co.id")?.kind).toBe("official");
  });
});

describe("link classification — brand matching respects label boundaries", () => {
  it("does not read 'investasi-cepat' as an imitation of SiCepat", () => {
    const f = classifyLink("https://investasi-cepat.xyz/register");
    expect(f?.kind).not.toBe("typosquat");
    expect(f?.imitates).toBeUndefined();
  });

  it("still catches a hyphen-separated SiCepat fake", () => {
    const f = classifyLink("https://sicepat-verif.xyz/klaim");
    expect(f?.kind).toBe("typosquat");
    expect(f?.imitates).toBe("SiCepat");
  });
});

describe("Link Agent — structural additions", () => {
  it("flags a punycode host", () => {
    // \u0441 is CYRILLIC SMALL LETTER ES, not Latin "c". The WHATWG URL parser
    // converts it to xn--ba-omc.xyz, which is exactly the disguise in the wild.
    const [signal] = linkSignals("Buka https://b\u0441a.xyz/masuk");
    expect(signal?.label).toMatch(/punycode|aksara/i);
  });

  it("flags an already-encoded punycode host", () => {
    const [signal] = linkSignals("Buka https://xn--ba-omc.xyz/masuk");
    expect(signal?.label).toMatch(/punycode|aksara/i);
  });

  it("flags a credential path on a non-official host", () => {
    const [signal] = linkSignals(
      "Login di https://aman-sekali.xyz/verifikasi?token=1",
    );
    expect(signal?.label).toMatch(/login|verifikasi|kredensial/i);
  });

  it("flags a brand smuggled into a subdomain", () => {
    const [signal] = linkSignals("Cek https://bca.klik-verifikasi.xyz");
    expect(signal?.label).toMatch(/BCA/);
  });

  it("still resolves official domains before any of the above", () => {
    expect(linkSignals("Buka https://ib.bri.co.id/login")).toEqual([]);
  });

  it("does not fire a credential path on an ordinary official page", () => {
    expect(linkSignals("https://www.tokopedia.com/login")).toEqual([]);
  });
});
