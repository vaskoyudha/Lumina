import type { AgentId } from "@/lib/contracts/score";

/**
 * The detectors that actually run; `scoring` aggregates them, it is not one.
 *
 * Typing this subset keeps the distinction checkable — the sidebar can map
 * every detector to an icon without inventing a row for the orchestrator.
 */
export type DetectorAgent = Exclude<AgentId, "scoring">;

/**
 * The agents the evidence panel walks through, in reading order.
 *
 * Shared by both companion surfaces on purpose: the panel is the product's
 * honesty display, and two copies of this list would eventually disagree
 * between the chat and the single-shot page.
 *
 * Order matches the reference graph — Message, Link, Identity, Conversation,
 * Evidence — so the panel reads the same left-to-right story as the design.
 *
 * Identity Agent sits third because it runs on the name and domain a message
 * carries, and on nothing else — SPF/DKIM/DMARC would need mail headers a
 * pasted message never has. It reports no finding rather than inventing one,
 * which is exactly the gap the panel is supposed to show.
 */
export const AGENT_SEQUENCE: DetectorAgent[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "evidence",
];
