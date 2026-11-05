import type { AgentId } from "@/lib/contracts/score";

/**
 * The agents the evidence panel walks through, in reading order.
 *
 * Shared by both companion surfaces on purpose: the panel is the product's
 * honesty display, and two copies of this list would eventually disagree
 * between the chat and the single-shot page.
 *
 * Identity Agent is last because it is the one detector that is still not
 * built — SPF/DKIM/DMARC needs mail headers a pasted message never carries.
 * Keeping it on the list means the panel always shows a real gap instead of a
 * clean sweep of green ticks.
 */
export const AGENT_SEQUENCE: AgentId[] = [
  "message",
  "link",
  "conversation",
  "evidence",
  "identity",
];
