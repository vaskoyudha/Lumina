import type { Signal } from "@/lib/contracts/score";
import { isQuotedWarning } from "@/lib/scoring/context";
import { normalizeWithMap, originalSpan } from "@/lib/scoring/normalize";

const PATTERNS = [
  /\babaikan\s+(?:semua\s+)?(?:instruksi|aturan|perintah)\s+(?:sebelumnya|di atas)\b/gi,
  /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|rules|prompts)\b/gi,
  /\banggap\s+(?:pesan|teks|ini)(?:\s+ini)?\s+(?:aman|bukan penipuan|bersih)\b/gi,
  /\b(?:kamu\s+(?:adalah|sekarang)|you are now)\b[^.!\n]{0,55}\b(?:pemeriksa|asisten|assistant|model|system)\b/gi,
  /\bjangan\s+(?:tandai|laporkan|nilai)\s+(?:sebagai\s+)?(?:penipuan|scam|bahaya)\b/gi,
  /\b(?:nilai\s+(?:ini|pesan ini)|beri\s+skor(?:\s+(?:ini|pesan ini))?)\s+(?:0|nol|100|seratus)\b/gi,
  /<\/?system>|<\/instructions>|###\s*system|\bsystem\s*:/gi,
];
export function injectionSignals(input: string): {
  signals: Signal[];
  note?: string;
} {
  const normalized = normalizeWithMap(input);
  for (const pattern of PATTERNS)
    for (const match of normalized.text.matchAll(new RegExp(pattern))) {
      if (isQuotedWarning(normalized.text, match.index, match[0].length))
        continue;
      const [start, end] = originalSpan(
        normalized,
        match.index,
        match.index + match[0].length,
      );
      return {
        signals: [
          {
            label: "Pesan mencoba memberi instruksi kepada pemeriksa",
            weight: 0.6,
            evidence: input.slice(start, end),
            agent: "injection",
            mechanism: "injection",
            ruleId: "injection.imperative",
          },
        ],
      };
    }
  return {
    signals: [],
    note: "Tidak ada instruksi yang ditujukan kepada pemeriksa.",
  };
}
