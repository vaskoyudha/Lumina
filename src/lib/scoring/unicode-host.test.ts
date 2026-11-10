import {
  hostSkeleton,
  mixedScripts,
  unicodeHost,
} from "@/lib/scoring/unicode-host";

describe("unicodeHost", () => {
  it("decodes a punycode label", () => {
    expect(unicodeHost("xn--bcher-kva.example")).toBe("bücher.example");
  });

  it("leaves an ASCII host alone", () => {
    expect(unicodeHost("bca.co.id")).toBe("bca.co.id");
  });

  it("returns the label unchanged when punycode is malformed", () => {
    expect(unicodeHost("xn--a!!!.example")).toBe("xn--a!!!.example");
    expect(unicodeHost("xn--.example")).toBe("xn--.example");
  });
});

describe("hostSkeleton", () => {
  it("folds Cyrillic lookalikes onto Latin", () => {
    // bаnkbcа with U+0430 CYRILLIC SMALL LETTER A in both places.
    expect(hostSkeleton("b\u0430nkbc\u0430.com")).toBe("bankbca.com");
  });

  it("folds Greek lookalikes onto Latin", () => {
    expect(hostSkeleton("\u03C1aypal.com")).toBe("paypal.com");
  });

  it("strips zero-width characters before comparing", () => {
    expect(hostSkeleton("b\u200Bca.co.id")).toBe("bca.co.id");
  });

  it("decodes punycode before folding", () => {
    expect(hostSkeleton("xn--bcher-kva.example")).toBe("bücher.example");
  });
});

describe("mixedScripts", () => {
  it("flags a label that mixes Latin and Cyrillic", () => {
    expect(mixedScripts("b\u0430nkbc\u0430.com")).toBe(true);
  });

  it("stays quiet for a pure Latin host", () => {
    expect(mixedScripts("bankbca.com")).toBe(false);
  });

  it("stays quiet for a pure Cyrillic host", () => {
    expect(
      mixedScripts("\u043F\u0440\u0438\u043C\u0435\u0440.\u0440\u0444"),
    ).toBe(false);
  });
});
