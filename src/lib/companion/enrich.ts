import { z } from "zod";
import type { Signal } from "@/lib/contracts/score";
import { scoreWithTrace, type TracedScore } from "@/lib/scoring/score";
import { planEnrichment } from "@/lib/verify/plan";

const SignalSchema = z
  .object({
    ruleId: z.enum(["link.blocklist", "link.domain-age", "file.hash-listed"]),
    weight: z.number().min(0).max(1),
    evidence: z.string().max(2048),
    label: z.string().max(240),
    agent: z.enum(["link", "evidence"]),
    mechanism: z.enum(["link-deception", "attachment-risk"]),
  })
  .strict();
const VerificationSchema = z.object({
  status: z.enum(["ok", "gagal", "dilewati"]),
  signals: z.array(SignalSchema).max(5),
  note: z.string().max(1000).optional(),
  blocklists: z
    .array(
      z.object({
        source: z.string().max(80),
        listed: z.boolean().nullable(),
        status: z.enum(["ok", "tidak tersedia"]),
      }),
    )
    .optional(),
  domainAgeDays: z.number().nonnegative().nullable().optional(),
  tls: z
    .object({ issuer: z.string().nullable(), ageDays: z.number().nullable() })
    .nullable()
    .optional(),
});
export type PublicVerification = z.infer<typeof VerificationSchema>;
export async function enrichScore(
  text: string,
  initial: TracedScore,
  signal: AbortSignal,
  mode: "direct" | "cached" = "direct",
): Promise<{ scored: TracedScore; verifications: PublicVerification[] }> {
  const plan = planEnrichment({ text, localRisk: initial.result.risk });
  const started = performance.now();
  const results = await Promise.all(
    plan.urls.map(async (url) => {
      try {
        const response = await fetch("/api/verify-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, mode }),
          signal,
        });
        if (!response.ok) return null;
        const body = await response.json();
        return body.ok ? VerificationSchema.parse(body.verification) : null;
      } catch {
        return null;
      }
    }),
  );
  const verifications = results.filter(
    (r): r is PublicVerification => r !== null,
  );
  const extra = verifications.flatMap((v) =>
    v.status === "ok" || (mode === "cached" && v.status === "dilewati")
      ? v.signals
      : [],
  );
  const scored = extra.length
    ? scoreWithTrace({
        text,
        extraSignals: [
          ...initial.result.signals.filter((s) => s.weight > 0),
          ...extra,
        ],
      })
    : initial;
  const status = results.some((r) => r === null || r.status === "gagal")
    ? "gagal"
    : verifications.every((v) => v.status === "dilewati")
      ? "dilewati"
      : "selesai";
  return {
    scored: {
      result: scored.result,
      trace: {
        ...scored.trace,
        stages: [
          ...scored.trace.stages.filter((s) => s.id !== "verify"),
          {
            id: "verify",
            label: "Verifikasi lanjutan",
            task: "Fakta publik opsional",
            status,
            findings: 0,
            ms: performance.now() - started,
            note:
              status === "gagal"
                ? "Verifikasi lanjutan tidak tersedia; hasil lokal dipertahankan."
                : verifications
                    .map((v) => v.note)
                    .filter(Boolean)
                    .join(" "),
          },
        ],
        totalMs: scored.trace.totalMs + performance.now() - started,
      },
    },
    verifications,
  };
}
export async function requestFileReputation(
  sha256: string,
  filename: string,
  signal: AbortSignal,
): Promise<{ signals: Signal[]; note: string }> {
  try {
    const response = await fetch("/api/verify-file", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha256 }),
      signal,
    });
    if (!response.ok) throw new Error("source");
    const body = await response.json();
    const result = VerificationSchema.parse(body.verification);
    return {
      signals:
        result.status === "ok"
          ? result.signals.map((s) => ({ ...s, evidence: filename }))
          : [],
      note: result.note ?? "Belum ada hasil reputasi.",
    };
  } catch {
    return {
      signals: [],
      note: "Reputasi hash tidak tersedia; hasil lokal dipertahankan.",
    };
  }
}
