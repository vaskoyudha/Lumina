import {
  type OrchestrationTrace,
  type OrchestratorEvent,
  OrchestratorEventSchema,
  type OrchestratorRequest,
} from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";

export interface OrchestratorStreamResult {
  outcome: "model" | "unavailable" | "timeout";
  text: string;
  events: OrchestratorEvent[];
  trace: OrchestrationTrace | null;
  score: ScoreResult | null;
}

function parseEvent(line: string): OrchestratorEvent | null {
  const data = line.startsWith("data:") ? line.slice(5).trim() : "";
  if (!data || data === "[DONE]") return null;
  try {
    const parsed = OrchestratorEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function streamOrchestrator(
  request: OrchestratorRequest,
  options: {
    signal: AbortSignal;
    onEvent?: (event: OrchestratorEvent) => void;
  },
): Promise<OrchestratorStreamResult> {
  let response: Response;
  try {
    response = await fetch("/api/companion/orchestrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: options.signal,
    });
  } catch (error) {
    return {
      outcome:
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "unavailable",
      text: "",
      events: [],
      trace: null,
      score: null,
    };
  }

  if (!response.ok || !response.body) {
    return {
      outcome: "unavailable",
      text: "",
      events: [],
      trace: null,
      score: null,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: OrchestratorEvent[] = [];
  let text = "";
  let trace: OrchestrationTrace | null = null;
  let score: ScoreResult | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const event = parseEvent(line.trim());
        if (!event) continue;
        events.push(event);
        options.onEvent?.(event);
        if (event.type === "score" && event.result) {
          score = event.result as ScoreResult;
        }
        if (event.type === "synthesis_delta") text += event.text;
        if (event.type === "synthesis_end") text = event.text;
        if (event.type === "trace") {
          trace = event.trace as OrchestrationTrace;
        }
      }
    }
  } catch (error) {
    return {
      outcome:
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "unavailable",
      text,
      events,
      trace,
      score,
    };
  }

  if (!text.trim()) {
    return { outcome: "unavailable", text, events, trace, score };
  }

  return { outcome: "model", text, events, trace, score };
}
