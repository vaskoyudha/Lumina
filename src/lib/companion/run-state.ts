import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";

/**
 * The band is a result, not a preview: it may appear only after the crew has
 * reported. A turn with no orchestration events is not a live run.
 */
export function runSettled(events: OrchestratorEvent[] | undefined): boolean {
  if (!events || events.length === 0) return true;
  const last = events[events.length - 1];
  if (last.type === "error") return true;
  return events.some(
    (event) => event.type === "synthesis_end" || event.type === "done",
  );
}
