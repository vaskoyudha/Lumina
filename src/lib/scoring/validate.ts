import type { ValidationSummary } from "@/lib/contracts/agent-run";
import type { Signal } from "@/lib/contracts/score";
import { annotateSignal } from "@/lib/scoring/mechanism";
export function validateSignals(
  input: readonly Signal[],
  hardOverride: boolean,
): {
  signals: Signal[];
  summary: ValidationSummary;
  mapping: { ruleId: string; keptRuleId: string }[];
} {
  const annotated = input
    .filter((s) => s.weight > 0)
    .map((s) => annotateSignal(s));
  const contradictions: string[] = [];
  const official = new Set(
    input
      .filter((s) => s.ruleId === "link.official-domain")
      .map((s) => s.evidence),
  );
  const warning = new Set(
    input
      .filter((s) => s.ruleId === "message.quoted-warning")
      .map((s) => s.evidence),
  );
  const candidates = annotated.filter((s) => {
    if (
      s.ruleId === "message.quoted-warning" ||
      s.ruleId === "link.official-domain"
    )
      return false;
    if (
      (s.ruleId === "link.lookalike" && official.has(s.evidence)) ||
      warning.has(s.evidence)
    ) {
      contradictions.push(s.ruleId ?? "");
      return false;
    }
    return true;
  });
  const clusters = new Map<string, Signal>();
  for (const s of candidates) {
    const key = s.mechanism ?? "identity-mismatch";
    const prior = clusters.get(key);
    if (!prior || s.weight > prior.weight) clusters.set(key, s);
  }
  const signals = [...clusters.values()].sort((a, b) => b.weight - a.weight);
  const topWeight = signals[0]?.weight ?? 0;
  const conflicting =
    contradictions.length > 0 && clusters.size < 2 && !hardOverride;
  const thin = !hardOverride && clusters.size === 1 && topWeight < 0.5;
  const verdict = conflicting ? "bertentangan" : thin ? "tipis" : "cukup";
  const summary: ValidationSummary = {
    verdict,
    clusters: clusters.size,
    topWeight,
    capped: thin || conflicting,
    rawFindings: annotated.length,
    contradictions,
    note: conflicting
      ? `Ada kontradiksi pada ${contradictions.join(", ")}; periksa sumber bukti.`
      : thin
        ? "Hanya satu pola pendukung yang lemah. Periksa ulang sebelum menyimpulkan."
        : clusters.size
          ? `${clusters.size} mekanisme bukti; temuan sejenis digabung.`
          : "Belum ada bukti pola yang dikenali.",
  };
  return {
    signals,
    summary,
    mapping: candidates.map((s) => ({
      ruleId: s.ruleId ?? "",
      keptRuleId:
        clusters.get(s.mechanism ?? "identity-mismatch")?.ruleId ?? "",
    })),
  };
}
