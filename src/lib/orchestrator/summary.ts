import type { OrchestrationTrace } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";

export interface AgentRunSummary {
  runId: string;
  modus: string;
  band: ScoreResult["risk"];
  plannerSource: "model" | "fallback";
  totalMs: number;
  agents: {
    id: string;
    label: string;
    status: string;
    ms: number;
  }[];
}

/**
 * The only shape that may leave the device for /agen. Tasks, summaries,
 * findings, quotes, rationale, and Lumina's announcement are deliberately
 * absent: they are derived from the checked message. `runId` is the
 * server-generated id, never a client-supplied case id.
 */
export function summarizeRun(
  trace: OrchestrationTrace,
  score: ScoreResult,
): AgentRunSummary {
  return {
    runId: trace.runId,
    modus: score.modus,
    band: score.risk,
    plannerSource: trace.planner.source,
    totalMs: trace.totalMs,
    agents: trace.agents.map((agent) => ({
      id: agent.id,
      label: agent.label,
      status: agent.status,
      ms: agent.ms,
    })),
  };
}
