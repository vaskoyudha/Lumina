import { extractQrisPayload, parseQris, qrisSignals } from "@/lib/scoring/qris";

const CRC_TABLE = (() => {
  const table = new Uint16Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    table[i] = crc & 0xffff;
  }
  return table;
})();

function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc =
      ((crc << 8) & 0xffff) ^
      CRC_TABLE[((crc >> 8) ^ input.charCodeAt(i)) & 0xff];
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Recompute the trailing 6304 CRC after editing a payload body. */
function reseal(payload: string): string {
  const index = payload.lastIndexOf("6304");
  const body = payload.slice(0, index + 4);
  return `${body}${crc16(body)}`;
}

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

  it("returns no signal at all for a valid, matching Rupiah payload", () => {
    const result = qrisSignals(`Bayar ke Toko Jaya: ${VALID}`);
    expect(result.signals).toEqual([]);
  });

  it("flags a non-Rupiah currency", () => {
    const payload = reseal(VALID.replace("5303360", "5303840"));
    expect(parseQris(payload)?.crcValid).toBe(true);
    const result = qrisSignals(payload);
    expect(result.signals.some((s) => /mata uang|rupiah/i.test(s.label))).toBe(
      true,
    );
  });

  it("flags a non-Indonesian country", () => {
    const payload = reseal(VALID.replace("5802ID", "5802SG"));
    expect(parseQris(payload)?.crcValid).toBe(true);
    const result = qrisSignals(payload);
    expect(result.signals.some((s) => /negara|indonesia/i.test(s.label))).toBe(
      true,
    );
  });

  it("flags a wa.me link inside the payload as a URI", () => {
    const payload = reseal(VALID.replace("5909TOKO JAYA", "5909wa.me/123"));
    expect(parseQris(payload)?.crcValid).toBe(true);
    const result = qrisSignals(payload);
    expect(result.signals.some((s) => /tautan|quishing/i.test(s.label))).toBe(
      true,
    );
  });

  it("rejects a truncated TLV instead of inventing tags", () => {
    expect(parseQris("0002010199xxxxxxxxxx")).toBeNull();
    expect(parseQris("000201")).toBeNull();
    expect(extractQrisPayload("tidak ada payload di sini")).toBeNull();
    expect(extractQrisPayload("000201 tanpa CRC")).toBeNull();
  });

  it("credits every finding to the qris agent", () => {
    const broken = `${VALID.slice(0, -4)}0000`;
    const signals = qrisSignals(broken).signals;
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => signal.agent === "qris")).toBe(true);
  });
});
