import { z } from "zod";
import type { ConsensusGroup } from "@/lib/contracts/orchestrator";

export const ScoreDecisionSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    rationale: z.string().trim().min(3).max(600),
    pointSignals: z
      .array(z.string().trim().min(2).max(160))
      .min(1)
      .max(5),
  })
  .strict();

export type ScoreDecision = z.infer<typeof ScoreDecisionSchema>;

export type ScoreDecisionResult =
  | { ok: true; decision: ScoreDecision }
  | { ok: false; issues: string[] };

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Lumina may set any score, but only from a grounded consensus group and only
 * while citing at least one signal that group actually reported.
 */
export function validateScoreDecision(
  input: unknown,
  group: ConsensusGroup | null,
): ScoreDecisionResult {
  if (!group) {
    return { ok: false, issues: ["score: belum ada konsensus"] };
  }

  const parsed = ScoreDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (issue) =>
          `${issue.path.join(".") || "score"}: ${issue.message}`,
      ),
    };
  }

  const known = new Set(group.points.map((point) => normalize(point.signal)));
  if (!parsed.data.pointSignals.some((signal) => known.has(normalize(signal)))) {
    return {
      ok: false,
      issues: ["pointSignals: tidak ada sinyal konsensus yang dikutip"],
    };
  }

  return { ok: true, decision: parsed.data };
}

export const SUBMIT_SCORE_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_score",
    description:
      "Tetapkan skor akhir 0-100 dari konsensus agen. Panggil hanya setelah agen melapor; sertakan rationale dan pointSignals yang mendukung.",
    parameters: z.toJSONSchema(ScoreDecisionSchema),
  },
};
