/**
 * EvidenceBundle — CONTRACT (§4). Owned by Stream A, consumed by Stream D (PDF).
 *
 * If A cannot produce a real bundle yet, D hardcodes one of these. The *shape*
 * is the contract; the contents are not.
 */

export type ArtifactKind = "text" | "screenshot" | "number" | "link" | "file";

export interface Artifact {
  id: string;
  /** e.g. "Tiga SMS OTP BCA" */
  label: string;
  kind: ArtifactKind;
  value: string;
  /** ISO 8601 */
  capturedAt: string;
}

export interface TimelineEntry {
  /** ISO 8601 */
  at: string;
  /** Plain sentence, past tense, no blame: "Pelaku meminta kode OTP." */
  what: string;
}

export interface EvidenceBundle {
  artifacts: Artifact[];
  timeline: TimelineEntry[];
  /** 2..4 sentences, ready to drop into the PDF. */
  narrative: string;
}

export const EMPTY_BUNDLE: EvidenceBundle = {
  artifacts: [],
  timeline: [],
  narrative: "",
};
