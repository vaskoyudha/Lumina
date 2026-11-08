import { extractQrisPayload, parseQris, qrisSignals } from "@/lib/scoring/qris";

/** Tag 59 = "TOKO JAYA" (9). CRC-16/CCITT over everything through 6304 = 2908. */
const VALID =
  "00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563042908";

/** Tag 59 = "https://evil.example" (20). CRC recomputed for the longer value = 41C7. */
const URI =
  "00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5920https://evil.example6007JAKARTA610512345630441C7";

describe("qris", () => {
  it("extracts a payload from surrounding text", () => {
    expect(extractQrisPayload(`Bayar ini: ${VALID} ya`)).toBe(VALID);
  });

  it("parses TLV, merchant fields, and a valid CRC", () => {
    const parsed = parseQris(VALID);
    expect(parsed).not.toBeNull();
    expect(parsed?.merchantName).toBe("TOKO JAYA");
    expect(parsed?.currency).toBe("360");
    expect(parsed?.country).toBe("ID");
    expect(parsed?.crcValid).toBe(true);
  });

  it("flags a URL inside the payload as quishing", () => {
    const result = qrisSignals(URI);
    expect(result.signals.some((s) => /quishing|tautan/i.test(s.label))).toBe(
      true,
    );
  });

  it("flags a broken CRC without calling a valid payload legitimate", () => {
    const broken = `${VALID.slice(0, -4)}0000`;
    const result = qrisSignals(broken);
    expect(result.signals.some((s) => /crc/i.test(s.label))).toBe(true);
    expect(
      result.signals.some((s) => /tidak.*aman|bersih|legit/i.test(s.label)),
    ).toBe(false);
  });

  it("reports a skipped stage when there is no payload", () => {
    const result = qrisSignals("Tolong bayar ke QRIS toko itu ya.");
    expect(result.signals).toEqual([]);
    expect(result.note).toMatch(/payload/i);
  });

  it("flags a merchant name that does not match the typed name", () => {
    const text = `Bayar ke Warung Bu Siti: ${VALID}`;
    const result = qrisSignals(text);
    expect(
      result.signals.some((s) => /nama merchant|stiker/i.test(s.label)),
    ).toBe(true);
  });

  it("does not flag a matching merchant name", () => {
    const text = `Bayar ke Toko Jaya: ${VALID}`;
    const result = qrisSignals(text);
    expect(
      result.signals.some((s) => /nama merchant|stiker/i.test(s.label)),
    ).toBe(false);
  });
});
