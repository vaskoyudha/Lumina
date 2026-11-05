import {
  type Artifact,
  EMPTY_BUNDLE,
  type EvidenceBundle,
} from "@/lib/contracts/evidence";
import type { ScoreResult } from "@/lib/contracts/score";

import { extractArtifacts } from "./extract";
import { composeNarrative } from "./narrative";
import { buildTimeline } from "./timeline";

/**
 * EvidenceBundle assembler — Stream A's half of the handoff to Stream D.
 *
 * Input is the conversation as the companion already holds it: the user's
 * messages plus the last `ScoreResult` for each. Nothing here re-scores, and
 * nothing here changes a verdict — this module only turns findings that
 * `score.ts` already produced into artifacts, a timeline, and a narrative.
 *
 * Failure behaviour: a throwing extractor returns EMPTY_BUNDLE rather than a
 * half-built bundle. A PDF with an empty evidence page is honest; a PDF with
 * three of five findings is not.
 */

export interface EvidenceTurn {
  /** The user's message, verbatim. */
  text: string;
  /** ISO 8601. Defaults to the build clock (stamped once, for the whole call). */
  at?: string;
  /** The result `scoreText` returned for this message, when it was scored. */
  result?: ScoreResult;
}

export interface BuildEvidenceOptions {
  /** Injectable clock — tests must not depend on the wall clock. */
  now?: () => Date;
}

function dedupeArtifacts(artifacts: readonly Artifact[]): Artifact[] {
  const byId = new Map<string, Artifact>();
  for (const artifact of artifacts) {
    if (!byId.has(artifact.id)) byId.set(artifact.id, artifact);
  }
  return [...byId.values()];
}

export function buildEvidenceBundle(
  turns: readonly EvidenceTurn[],
  options: BuildEvidenceOptions = {},
): EvidenceBundle {
  try {
    const now = options.now ?? (() => new Date());
    /**
     * Read the clock at most once, and only for a turn that arrived without a
     * timestamp. Reading it eagerly makes this function an unstable value
     * during render — Next 16 fails the prerender of a client component that
     * does that, even when the result is discarded one line later.
     */
    let fallbackAt: string | undefined;

    const stamped = turns.map((turn) => {
      if (turn.at) return { ...turn, at: turn.at };
      fallbackAt ??= now().toISOString();
      return { ...turn, at: fallbackAt };
    });

    const scored = stamped.filter((turn) => turn.result !== undefined);
    if (scored.length === 0) return EMPTY_BUNDLE;

    const artifacts = dedupeArtifacts(
      stamped.flatMap((turn) =>
        extractArtifacts({ text: turn.text, at: turn.at }),
      ),
    );

    // The verdict is the last scored message: that is what the user is
    // looking at when they ask for a report.
    const result = scored[scored.length - 1]?.result;
    if (!result) return EMPTY_BUNDLE;

    return {
      artifacts,
      timeline: buildTimeline(scored),
      narrative: composeNarrative({ result, artifacts }),
    };
  } catch {
    return EMPTY_BUNDLE;
  }
}
