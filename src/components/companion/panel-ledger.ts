import type { DetectorAgent } from "@/components/companion/agents";
import type { AgentTrace } from "@/lib/contracts/agent-run";
import type { Signal } from "@/lib/contracts/score";

/**
 * The result-state ledger. It turns a trace plus the surviving signals into a
 * stable roster of every agent, grouped by what actually happened.
 *
 * The important distinction is `no_object` versus `clean`: both have zero
 * findings, but `dilewati` means the detector looked and found no object of its
 * kind, while `selesai` means it inspected an object and found no pattern.
 */
export type PanelOutcome =
  | "finding"
  | "clean"
  | "no_object"
  | "failed"
  | "live"
  | "pending";

export interface PanelAgent {
  agent: DetectorAgent;
  outcome: PanelOutcome;
  count: number;
  findings: Signal[];
  note?: string;
  ms?: number;
}

export interface PanelLedger {
  agents: PanelAgent[];
  findingAgents: PanelAgent[];
  cleanAgents: PanelAgent[];
  noObjectAgents: PanelAgent[];
  failedAgents: PanelAgent[];
  liveAgents: PanelAgent[];
  pendingAgents: PanelAgent[];
  otherFindings: Signal[];
  counts: {
    checked: number;
    finding: number;
    clean: number;
    noObject: number;
    failed: number;
    live: number;
    pending: number;
  };
}

export function buildPanelLedger(
  sequence: readonly DetectorAgent[],
  trace: AgentTrace | null | undefined,
  findings: readonly Signal[],
): PanelLedger {
  const positive = findings.filter((signal) => signal.weight > 0);
  const byAgent = new Map<string, Signal[]>();

  for (const signal of positive) {
    const key = signal.agent ?? "scoring";
    const current = byAgent.get(key);
    if (current) {
      current.push(signal);
    } else {
      byAgent.set(key, [signal]);
    }
  }

  const stageById = new Map(
    (trace?.stages ?? []).map((stage) => [stage.id, stage]),
  );

  const agents: PanelAgent[] = sequence.map((agent) => {
    const agentFindings = byAgent.get(agent) ?? [];
    const stage = stageById.get(agent);
    const count = agentFindings.length;

    let outcome: PanelOutcome;
    if (trace && count > 0) {
      outcome = "finding";
    } else if (!trace) {
      // Without a trace the findings are still real, but coverage is not.
      // Keep them visible through `findingAgents` and do not claim a status.
      outcome = "pending";
    } else if (stage?.status === "berjalan") {
      outcome = "live";
    } else if (stage?.status === "gagal") {
      outcome = "failed";
    } else if (stage?.status === "dilewati") {
      outcome = "no_object";
    } else if (stage?.status === "selesai" || stage?.status === "temuan") {
      outcome = "clean";
    } else {
      outcome = "pending";
    }

    return {
      agent,
      outcome,
      count,
      findings: [...agentFindings],
      note: stage?.note,
      ms: stage?.ms,
    };
  });

  const byOutcome = (outcome: PanelOutcome) =>
    agents.filter((agent) => agent.outcome === outcome);

  const findingAgents = agents.filter((agent) => agent.count > 0);
  const cleanAgents = byOutcome("clean");
  const noObjectAgents = byOutcome("no_object");
  const failedAgents = byOutcome("failed");
  const liveAgents = byOutcome("live");
  const pendingAgents = agents.filter(
    (agent) => agent.outcome === "pending" && agent.count === 0,
  );

  const sequenceSet = new Set<string>(sequence);
  const otherFindings = positive.filter(
    (signal) => !sequenceSet.has(signal.agent ?? "scoring"),
  );

  return {
    agents,
    findingAgents,
    cleanAgents,
    noObjectAgents,
    failedAgents,
    liveAgents,
    pendingAgents,
    otherFindings,
    counts: {
      checked:
        (trace ? findingAgents.length : 0) +
        cleanAgents.length +
        noObjectAgents.length +
        failedAgents.length,
      finding: findingAgents.length,
      clean: cleanAgents.length,
      noObject: noObjectAgents.length,
      failed: failedAgents.length,
      live: liveAgents.length,
      pending: pendingAgents.length,
    },
  };
}
