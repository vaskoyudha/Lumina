import { SCAM_TEMPLATES } from "@/data/scam-templates";
import type { Signal } from "@/lib/contracts/score";
import { isQuotedWarning } from "@/lib/scoring/context";
import { normalizeWithMap } from "@/lib/scoring/normalize";
export function shingles(text: string): Set<string> {
  const normalized = normalizeWithMap(text).text.replace(/\s+/g, " ").trim();
  return new Set(
    Array.from({ length: Math.max(0, normalized.length - 4) }, (_, i) =>
      normalized.slice(i, i + 5),
    ),
  );
}
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const s of a) if (b.has(s)) overlap++;
  return overlap / (a.size + b.size - overlap);
}
const templates = SCAM_TEMPLATES.map(([id, mechanism, text]) => ({
  id,
  mechanism,
  text,
  grams: shingles(text),
}));
export function fingerprintSignals(text: string): Signal[] {
  if (isQuotedWarning(text, 0, text.length)) return [];
  const grams = shingles(text);
  const best = templates
    .map((t) => ({ ...t, similarity: jaccard(grams, t.grams) }))
    .sort((a, b) => b.similarity - a.similarity)[0];
  return best && best.similarity >= 0.55
    ? [
        {
          label: "Polanya mirip contoh kampanye penipuan dalam pustaka lokal",
          weight: 0.3,
          evidence: text.slice(0, 160),
          agent: "message",
          mechanism: best.mechanism,
          ruleId: `fingerprint.${best.id}`,
        },
      ]
    : [];
}
export function closestCampaign(text: string): string | null {
  const grams = shingles(text);
  const match = templates.find((t) => jaccard(grams, t.grams) >= 0.55);
  return match?.id ?? null;
}
