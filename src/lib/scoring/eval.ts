import { isRisky } from "@/lib/contracts/score";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import { scoreText } from "@/lib/scoring/score";

/**
 * The measurement behind every accuracy number the pitch may quote.
 *
 * STATUS.md used to carry numbers copied from a terminal once; this makes
 * them a function call, so a detector change either keeps the claim true or
 * turns a named test red. `classification` counts only the cases whose
 * expected modus the engine actually named — caught is not the same as
 * correctly understood.
 */
export interface EvalModusGroup {
  modus: string;
  total: number;
  caught: number;
}

export interface EvalReport {
  scamTotal: number;
  caught: number;
  nailed: number;
  falsePositives: number;
  legitTotal: number;
  legitNotRisky: number;
  classification: number;
  byModus: EvalModusGroup[];
  /**
   * CPU milliseconds of the slowest single case, measured after the engine
   * has been warmed on that exact input and taking the best of three runs.
   *
   * Both corrections are about what the number claims. `process.cpuUsage()`
   * is process-wide, so during the first moments of a Jest worker it also
   * counts V8's background compiler threads warming this very module — a
   * cost the engine does not charge per message. And the first pass over an
   * input pays lazy regex compilation for the patterns that input hits. The
   * deterministic engine is synchronous, so a warm, uncontended run is the
   * cost the reader actually pays when a message is checked.
   */
  slowestCpuMs: number;
}

const REPS = 3;

/**
 * Runs `fn` and reports its value plus the cheapest of `REPS` measurements.
 * The engine is pure, so every repetition returns the same value; the first
 * call doubles as the warm-up and its value is returned.
 */
function measured<T>(fn: () => T): { value: T; cpuMs: number } {
  const value = fn();
  let cpuMs = Number.POSITIVE_INFINITY;
  for (let rep = 0; rep < REPS; rep += 1) {
    const started = process.cpuUsage();
    fn();
    const { user, system } = process.cpuUsage(started);
    cpuMs = Math.min(cpuMs, (user + system) / 1000);
  }
  return { value, cpuMs };
}

export function runEval(): EvalReport {
  let caught = 0;
  let nailed = 0;
  let slowestCpuMs = 0;
  let classification = 0;
  const groups = new Map<string, EvalModusGroup>();

  for (const testCase of SCAM_CASES) {
    const { value: result, cpuMs } = measured(() =>
      scoreText({ text: testCase.text }),
    );
    slowestCpuMs = Math.max(slowestCpuMs, cpuMs);

    if (isRisky(result.risk)) caught += 1;
    if (result.risk === "tinggi") nailed += 1;

    if (testCase.wantModus) {
      const group = groups.get(testCase.wantModus) ?? {
        modus: testCase.wantModus,
        total: 0,
        caught: 0,
      };
      group.total += 1;
      if (result.modus === testCase.wantModus) {
        group.caught += 1;
        classification += 1;
      }
      groups.set(testCase.wantModus, group);
    }
  }

  let falsePositives = 0;
  for (const testCase of LEGIT_CASES) {
    const { value: result, cpuMs } = measured(() =>
      scoreText({ text: testCase.text }),
    );
    slowestCpuMs = Math.max(slowestCpuMs, cpuMs);
    if (isRisky(result.risk)) falsePositives += 1;
  }

  return {
    scamTotal: SCAM_CASES.length,
    caught,
    nailed,
    falsePositives,
    legitTotal: LEGIT_CASES.length,
    legitNotRisky: LEGIT_CASES.length - falsePositives,
    classification,
    byModus: [...groups.values()].sort((a, b) =>
      a.modus.localeCompare(b.modus),
    ),
    slowestCpuMs,
  };
}
