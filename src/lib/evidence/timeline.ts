import type { TimelineEntry } from "@/lib/contracts/evidence";
import { type AgentId, isRisky, type ScoreResult } from "@/lib/contracts/score";

/**
 * Timeline assembly — the conversation in the order it happened.
 *
 * One entry per distinct finding, not per message: a victim who pasted four
 * messages that all pressure them does not need four identical lines, they
 * need "the pressure started here". Weight is a UI concern (`score.ts`
 * already sorts signals); this module only decides *what happened* and *when*.
 */

export interface TimelineTurn {
  /** ISO 8601. */
  at: string;
  result?: ScoreResult;
}

/** Keep the timeline readable on one PDF page. */
const MAX_ENTRIES = 8;
/** Strongest findings per message; the rest are already in the panel. */
const PER_TURN = 3;
/**
 * Soft context signals (an OTP *notification* at 0.15) are useful to the
 * score, but in a timeline they read as accusations. Below this weight the
 * finding stays in the panel and out of the report.
 */
const MIN_TIMELINE_WEIGHT = 0.3;

/**
 * Strip the explanatory tail that labels carry for humans:
 *   "Meminta kode OTP — bank dan instansi tidak pernah memintanya"
 *   → "meminta kode OTP"
 */
function phrase(label: string): string {
  const [head] = label.split(" — ");
  return (head ?? label).trim().replace(/[.!?]+$/, "");
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function entryFor(agent: AgentId | undefined, label: string): string | null {
  const body = phrase(label);
  if (body.length === 0) return null;

  if (agent === "message") {
    return `Pelaku ${lowerFirst(body)}.`;
  }
  if (agent === "link") {
    return `Pesan memuat ${lowerFirst(body)}.`;
  }
  // The scoring agent's honest empty state and anything else: quote it.
  return `${body}.`;
}

export function buildTimeline(turns: readonly TimelineTurn[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const seen = new Set<string>();

  for (const turn of turns) {
    const result = turn.result;
    if (!result) continue;
    // Only risky messages describe a perpetrator. A benign OTP notification
    // must not become "Pelaku menyebut OTP." in a document a bank reads.
    if (!isRisky(result.risk)) continue;

    let perTurn = 0;
    for (const signal of result.signals) {
      if (perTurn >= PER_TURN) break;
      if (signal.weight < MIN_TIMELINE_WEIGHT) continue;

      const what = entryFor(signal.agent, signal.label);
      if (!what || seen.has(what)) continue;

      seen.add(what);
      entries.push({ at: turn.at, what });
      perTurn++;
    }
  }

  return entries.slice(0, MAX_ENTRIES);
}
