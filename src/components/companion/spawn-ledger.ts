import type { DetectorAgent } from "@/components/companion/agents";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";

/**
 * The spawn ledger — only agents the orchestrator actually started.
 *
 * `agent_start` is the spawn event: the loop emits it for every planned
 * specialist, including one skipped by the deadline. A detector that the
 * planner never chose has no start event and must not appear, which is the
 * difference between this list and the engine's coverage roster.
 */
export type SpawnStatus = "berjalan" | "selesai" | "gagal" | "dilewati";

export interface SpawnedAgent {
  agent: DetectorAgent;
  label: string;
  task: string;
  status: SpawnStatus;
  findings: number;
  ms?: number;
}

export function buildSpawnLedger(
  events: readonly OrchestratorEvent[] | null | undefined,
): SpawnedAgent[] {
  const spawned = new Map<DetectorAgent, SpawnedAgent>();
  const order: DetectorAgent[] = [];

  for (const event of events ?? []) {
    if (event.type === "agent_start") {
      if (!spawned.has(event.agent)) order.push(event.agent);
      spawned.set(event.agent, {
        agent: event.agent,
        label: event.label,
        task: event.task,
        status: "berjalan",
        findings: 0,
      });
      continue;
    }

    if (event.type !== "agent_result") continue;

    // A result without a start is not a spawn: never let it add a row.
    const current = spawned.get(event.agent);
    if (!current) continue;

    current.status = event.status;
    current.findings = event.findings.length;
    current.ms = event.ms;
    if (event.label) current.label = event.label;
  }

  return order.map((agent) => spawned.get(agent) as SpawnedAgent);
}
