export interface NormalizedText {
  text: string;
  map: number[];
  ends: number[];
}
const FOLD: Record<string, string> = {
  a: "[a4@]",
  b: "[b8]",
  e: "[e3]",
  i: "[i1!]",
  l: "[l1]",
  o: "[o0]",
  s: "[s5$]",
  t: "[t7]",
};
const SENSITIVE = [
  "transfer",
  "kirim",
  "berikan",
  "bagikan",
  "masukkan",
  "password",
  "sandi",
  "otp",
  "pin",
  "kode",
  "abaikan",
  "instruksi",
  "ignore",
  "previous",
  "system",
  "nilai",
  "skor",
  "deposit",
  "topup",
  "bayar",
  "profit",
  "pasti",
];
/** Normalise matching text while mapping every UTF-16 unit to the original. */
export function normalizeWithMap(input: string): NormalizedText {
  let text = "";
  let map: number[] = [];
  let ends: number[] = [];
  for (const match of input.matchAll(/\P{M}\p{M}*|\p{M}+/gu)) {
    const normalized = match[0].normalize("NFKC").toLowerCase();
    for (const char of normalized) {
      if (/[\u200B-\u200D\u2060\uFEFF]/u.test(char)) continue;
      text += char;
      for (let i = 0; i < char.length; i++) {
        map.push(match.index);
        ends.push(match.index + match[0].length);
      }
    }
  }
  for (const word of SENSITIVE) {
    const chars = [...word].map((c) => FOLD[c] ?? c);
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}])${chars.join("[\\s.\\-_*\\p{S}]*")}(?![\\p{L}\\p{N}])`,
      "gu",
    );
    for (const match of [...text.matchAll(regex)].reverse()) {
      const start = match.index,
        stop = start + match[0].length;
      const positions = [...match[0].matchAll(/[\p{L}\p{N}@!$]/gu)].map(
        (m) => start + m.index,
      );
      const nextMap = [...word].map((_, i) => map[positions[i] ?? start]);
      const nextEnds = [...word].map((_, i) => ends[positions[i] ?? stop - 1]);
      text = text.slice(0, start) + word + text.slice(stop);
      map = [...map.slice(0, start), ...nextMap, ...map.slice(stop)];
      ends = [...ends.slice(0, start), ...nextEnds, ...ends.slice(stop)];
    }
  }
  return { text, map, ends };
}
export function originalSpan(
  norm: NormalizedText,
  start: number,
  end: number,
): [number, number] {
  return [norm.map[start] ?? 0, norm.ends[Math.max(start, end - 1)] ?? 0];
}
