import type { CrewId } from "@/lib/agents/identities";
import type {
  AgentStatus,
  ConsensusGroup,
  ConsensusPoint,
} from "@/lib/contracts/orchestrator";
import type { ReportPoint } from "@/lib/orchestrator/report";

/**
 * Consensus is presentational evidence, not a score. Two distinct agents must
 * ground the same mechanism with an exact quote before the orchestrator may ask
 * Lumina to author the final score.
 */
export function normalizePattern(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findConsensus(
  reports: readonly {
    agent: CrewId;
    status: AgentStatus;
    points: ReportPoint[];
  }[],
): ConsensusGroup[] {
  const byPattern = new Map<string, ConsensusPoint[]>();

  for (const report of reports) {
    if (report.status !== "selesai") continue;
    for (const point of report.points) {
      const quote = point.quote?.trim();
      if (!quote) continue;
      const pattern = normalizePattern(point.pattern);
      if (!pattern) continue;
      const points = byPattern.get(pattern) ?? [];
      points.push({
        agent: report.agent,
        signal: point.signal,
        point: point.point,
        quote,
        pattern,
      });
      byPattern.set(pattern, points);
    }
  }

  const groups: ConsensusGroup[] = [];
  for (const [pattern, points] of byPattern) {
    const agents = [...new Set(points.map((point) => point.agent))].sort();
    if (agents.length < 2) continue;
    groups.push({ pattern, agents, points });
  }

  return groups.sort(
    (a, b) =>
      b.agents.length - a.agents.length ||
      b.points.length - a.points.length ||
      a.pattern.localeCompare(b.pattern),
  );
}
