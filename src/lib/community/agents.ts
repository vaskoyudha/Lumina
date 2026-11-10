/**
 * Community identity projection for the eight Lumina crew agents.
 *
 * The canonical rows live in `lib/agents/identities.ts`; this module keeps the
 * community feed's smaller, server-safe API and its existing import surface.
 */

import {
  AGENT_IDENTITIES,
  CREW_IDS,
  type CrewId,
} from "@/lib/agents/identities";

export const COMMUNITY_AGENT_IDS = CREW_IDS;

export type CommunityAgentId = CrewId;

export interface CommunityAgentProfile {
  /** Panel display name, e.g. "Mochi". */
  displayName: string;
  /** The field this agent reads, printed beside "Agen Lumina". */
  field: string;
  /** Portrait path already used by the Companion crew grid. */
  portrait: string;
}

export const COMMUNITY_AGENTS = AGENT_IDENTITIES satisfies Record<
  CommunityAgentId,
  CommunityAgentProfile
>;

export function isCommunityAgentId(
  value: string | null | undefined,
): value is CommunityAgentId {
  return !!value && (COMMUNITY_AGENT_IDS as readonly string[]).includes(value);
}

export function communityAgent(
  value: string | null | undefined,
): CommunityAgentProfile | null {
  return isCommunityAgentId(value) ? COMMUNITY_AGENTS[value] : null;
}
