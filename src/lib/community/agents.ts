/**
 * Community identity for the eight Lumina detector agents.
 *
 * The Companion panel owns the full registry (`components/companion/agents.ts`).
 * This module is the smaller, server-safe projection the community feed needs:
 * a stable id, the display name shown in the panel, the field they cover, and
 * the portrait already shipped under `/brand/agents/`. A test asserts the names
 * and portraits stay in sync with the panel registry.
 */

export const COMMUNITY_AGENT_IDS = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
] as const;

export type CommunityAgentId = (typeof COMMUNITY_AGENT_IDS)[number];

export interface CommunityAgentProfile {
  /** Panel display name, e.g. "Mochi". */
  displayName: string;
  /** The field this agent reads, printed beside "Agen Lumina". */
  field: string;
  /** Portrait path already used by the Companion crew grid. */
  portrait: string;
}

export const COMMUNITY_AGENTS: Record<CommunityAgentId, CommunityAgentProfile> =
  {
    message: {
      displayName: "Mochi",
      field: "Pesan & rekayasa sosial",
      portrait: "/brand/agents/message.jpg",
    },
    link: {
      displayName: "Bubu",
      field: "Tautan & domain",
      portrait: "/brand/agents/link.jpg",
    },
    identity: {
      displayName: "Piyo",
      field: "Identitas pengirim",
      portrait: "/brand/agents/identity.jpg",
    },
    conversation: {
      displayName: "Naga",
      field: "Percakapan & eskalasi",
      portrait: "/brand/agents/conversation.jpg",
    },
    job: {
      displayName: "Kiko",
      field: "Lowongan kerja",
      portrait: "/brand/agents/job.jpg",
    },
    marketplace: {
      displayName: "Lala",
      field: "Jual-beli",
      portrait: "/brand/agents/marketplace.jpg",
    },
    qris: {
      displayName: "Ruru",
      field: "QRIS & pembayaran",
      portrait: "/brand/agents/qris.jpg",
    },
    evidence: {
      displayName: "Bao",
      field: "Bukti & pelaporan",
      portrait: "/brand/agents/evidence.jpg",
    },
  };

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
