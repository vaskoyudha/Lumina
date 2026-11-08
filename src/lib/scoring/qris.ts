import type { Signal } from "@/lib/contracts/score";

/**
 * QRIS Agent — EMVCo merchant-presented QR, parsed locally.
 *
 * Parser ported from verssache/qris-dinamis (MIT). See ATTRIBUTION.md.
 * A valid CRC only proves the payload is well formed; it says nothing about
 * who owns the merchant account. The UI prints that sentence next to the
 * result, and this module never treats a valid CRC as a clean verdict.
 */

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

interface Tlv {
  tag: string;
  value: string;
}

function parseTlv(payload: string): Tlv[] | null {
  const out: Tlv[] = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) return null;
    const tag = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(length)) return null;
    const start = i + 4;
    const end = start + length;
    if (end > payload.length) return null;
    out.push({ tag, value: payload.slice(start, end) });
    i = end;
  }
  return out;
}

export interface QrisParse {
  tags: Tlv[];
  merchantName: string | null;
  currency: string | null;
  country: string | null;
  crcValid: boolean;
  hasUri: boolean;
}

export function extractQrisPayload(text: string): string | null {
  const start = text.indexOf("000201");
  if (start === -1) return null;
  const rest = text.slice(start);
  const end = rest.search(/6304[0-9A-Fa-f]{4}/);
  if (end === -1) return null;
  return rest.slice(0, end + 8).trim();
}

export function parseQris(payload: string): QrisParse | null {
  if (!payload.startsWith("000201") || payload.length < 20) return null;
  const tags = parseTlv(payload);
  if (!tags) return null;

  const value = (tag: string) =>
    tags.find((entry) => entry.tag === tag)?.value ?? null;
  const crcIndex = payload.lastIndexOf("6304");
  const body = crcIndex === -1 ? "" : payload.slice(0, crcIndex + 4);
  const expected = payload.slice(crcIndex + 4, crcIndex + 8);
  const crcValid = body !== "" && crc16(body) === expected.toUpperCase();

  return {
    tags,
    merchantName: value("59"),
    currency: value("53"),
    country: value("58"),
    crcValid,
    hasUri: /(?:https?:\/\/|wa\.me\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(payload),
  };
}

export interface QrisResult {
  signals: Signal[];
  note?: string;
}

export function qrisSignals(text: string): QrisResult {
  const payload = extractQrisPayload(text);
  if (!payload) {
    const mentionsQr = /\b(?:qris|qr\s*code|scan\s+qr)\b/i.test(text);
    return {
      signals: [],
      note: mentionsQr
        ? "Tidak ada payload QRIS di teks. Pembacaan QR dari gambar belum tersedia — tempel teks payload-nya."
        : "Tidak ada payload QRIS.",
    };
  }
  const parsed = parseQris(payload);
  if (!parsed) {
    return { signals: [], note: "Payload QRIS tidak bisa dibaca." };
  }

  const signals: Signal[] = [];
  const evidence = payload.slice(0, 120);

  if (parsed.hasUri) {
    signals.push({
      label:
        "Payload QRIS memuat tautan — QR pembayaran tidak pernah mengarah ke situs",
      weight: 0.9,
      evidence,
      agent: "qris",
    });
  }
  if (!parsed.crcValid) {
    signals.push({
      label: "CRC QRIS tidak cocok — payload bisa rusak atau diubah",
      weight: 0.6,
      evidence,
      agent: "qris",
    });
  }
  if (parsed.currency && parsed.currency !== "360") {
    signals.push({
      label: "Mata uang QRIS bukan Rupiah (tag 53 ≠ 360)",
      weight: 0.4,
      evidence,
      agent: "qris",
    });
  }
  if (parsed.country && parsed.country !== "ID") {
    signals.push({
      label: "Negara QRIS bukan Indonesia (tag 58 ≠ ID)",
      weight: 0.4,
      evidence,
      agent: "qris",
    });
  }

  const typed = text.replace(payload, " ");
  const named =
    /\b(?:warung|toko|merchant|atas\s+nama|a\.n\.?)\b[^.!?]{0,40}/i.exec(
      typed,
    )?.[0] ?? null;
  if (parsed.merchantName && named) {
    const tokens = (value: string) =>
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4);
    const a = new Set(tokens(parsed.merchantName));
    const overlap = tokens(named).some((token) => a.has(token));
    if (!overlap) {
      signals.push({
        label:
          "Nama merchant di QRIS tidak cocok dengan nama yang disebut — kemungkinan stiker diganti",
        weight: 0.5,
        evidence: parsed.merchantName,
        agent: "qris",
      });
    }
  }

  return { signals };
}
