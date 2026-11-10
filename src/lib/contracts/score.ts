/**
 * ScoreResult — CONTRACT (§4). Owned by Stream A, consumed by Stream B.
 *
 * Changing a field here is changing a contract three other people build
 * against: announce it before the commit, not after.
 *
 * Hard invariants enforced by `src/lib/scoring/score.ts`:
 *   1. `signals` is never empty. If nothing was detected, it says so honestly.
 *   2. `signals` is sorted by descending weight.
 *   3. `risk` is derived from `score` here, never recalculated on the client.
 *   4. A request for OTP / PIN / password forces `risk: "tinggi"`.
 *   5. `relatedModule` is a module number from `modus.json`, or null.
 */

import type { MechanismId } from "@/lib/scoring/mechanism";
export type Risk = "bersih" | "rendah" | "mencurigakan" | "tinggi";

export interface Signal {
  /** Human-readable finding, e.g. "Domain baru berusia 12 hari". */
  label: string;
  /** Contribution weight, 0..1. Used for ordering, not for the final score. */
  weight: number;
  /** The exact substring of the user's input that triggered this signal. */
  evidence: string;
  /** Which detector produced it. Lets the UI show agents working one by one. */
  agent?: AgentId;
  mechanism?: MechanismId;
  ruleId?: string;
  /** Engine signal, or a point grounded by two agreeing agents. */
  source?: "engine" | "consensus";
}

export interface ConsensusEvidence {
  pattern: string;
  agents: AgentId[];
  pointSignals: string[];
}

export type AgentId =
  | "message"
  | "link"
  | "identity"
  | "conversation"
  | "job"
  | "marketplace"
  | "qris"
  | "email"
  | "injection"
  | "evidence"
  | "scoring";

export interface ScoreResult {
  /** 0..100. Integer. */
  score: number;
  /** Always derived from `score` via `riskFor()`, except the OTP hard override. */
  risk: Risk;
  /** At least one entry, sorted by descending weight. */
  signals: Signal[];
  /** Modus id from `modus.json`, or "tidak-dikenali". */
  modus: string;
  /** 1..4 imperative steps. */
  advice: string[];
  /** 1..12, or null when no module is relevant. */
  relatedModule: number | null;
  /** Did a hard risk indicator fire? Exposed so the UI can explain the override. */
  hardOverride: boolean;
  /** Who authored the score: the deterministic engine or Lumina from consensus. */
  source?: "engine" | "consensus";
  /** The engine score when it differs from the final score. */
  baselineScore?: number;
  /** Evidence group that unlocked the model decision. */
  consensus?: ConsensusEvidence;
}

/** The only place a score becomes a risk band. */
export function riskFor(score: number): Risk {
  if (score >= 70) return "tinggi";
  if (score >= 40) return "mencurigakan";
  if (score >= 15) return "rendah";
  return "bersih";
}

export const RISK_LABEL: Record<Risk, string> = {
  bersih: "Bersih",
  rendah: "Risiko rendah",
  mencurigakan: "Mencurigakan",
  tinggi: "Risiko tinggi",
};

/** Color token per risk band. Never hardcode these in a component. */
export const RISK_TOKEN: Record<Risk, "safe" | "warn" | "danger"> = {
  bersih: "safe",
  rendah: "safe",
  mencurigakan: "warn",
  tinggi: "danger",
};

export function isRisky(risk: Risk): boolean {
  return risk === "mencurigakan" || risk === "tinggi";
}
