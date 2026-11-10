/**
 * The detector pipeline order, in one place.
 *
 * `score.ts` evaluates them in this order and the companion's UI lists them in
 * this order, so a reordering cannot leave the panel describing a pipeline the
 * engine no longer runs. This module is data only — no rules, no RegExp — so a
 * client component can import it without pulling the scoring engine into its
 * bundle.
 */
export const DETECTOR_IDS = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
] as const;

export type DetectorId = (typeof DETECTOR_IDS)[number];
