import {
  type AnswerResult,
  requestAnswer,
} from "@/lib/companion/answer-client";
import type { AnswerRequest } from "@/lib/contracts/answer";
import type { ToolObservation } from "@/lib/contracts/loop";
import { MAX_AGENT_STEPS } from "@/lib/contracts/loop";
import type { ToolCall } from "@/lib/contracts/tool";

/**
 * Bounded client-side agent loop, modelled on Pi's tool loop.
 *
 * Pi's loop keeps one invariant that matters here: an assistant message may ask
 * for a tool, the tool produces exactly one typed result, that result is fed
 * back, and the loop stops when the assistant stops asking. The loop itself is
 * deliberately small — no sessions, no streaming, no steering. The browser owns
 * it because the tools need browser state (the job corpus and the last verdict).
 */

export type ToolExecution =
  | { kind: "observation"; observation: ToolObservation }
  | { kind: "terminal"; terminal: "report" };

export interface AgentLoopResult {
  outcome: AnswerResult["outcome"];
  text: string;
  calls: ToolCall[];
  observations: ToolObservation[];
  terminal: "report" | null;
  steps: number;
  /** Extra calls in one response that the loop did not execute. */
  ignored: number;
  failed: boolean;
}

export interface RunAgentLoopInput {
  request: AnswerRequest;
  execute: (call: ToolCall) => Promise<ToolExecution>;
  signal: AbortSignal;
  maxSteps?: number;
  requestStep?: typeof requestAnswer;
}

function empty(
  outcome: AgentLoopResult["outcome"],
  text: string,
  extra: Partial<AgentLoopResult> = {},
): AgentLoopResult {
  return {
    outcome,
    text,
    calls: [],
    observations: [],
    terminal: null,
    steps: 0,
    ignored: 0,
    failed: outcome !== "model",
    ...extra,
  };
}

export async function runAgentLoop({
  request,
  execute,
  signal,
  maxSteps = MAX_AGENT_STEPS,
  requestStep = requestAnswer,
}: RunAgentLoopInput): Promise<AgentLoopResult> {
  const limit = Math.max(1, Math.min(maxSteps, MAX_AGENT_STEPS));
  const observations: ToolObservation[] = [];
  const calls: ToolCall[] = [];
  let text = "";
  let steps = 0;
  let ignored = 0;

  for (let step = 0; step < limit; step++) {
    if (signal.aborted) {
      return {
        ...empty("timeout", text),
        calls,
        observations,
        steps,
        ignored,
      };
    }

    const result = await requestStep(
      {
        ...request,
        observations: [...observations],
        final: step === limit - 1,
      },
      signal,
    );
    steps += 1;

    if (result.text.trim().length > 0) text = result.text.trim();
    if (result.outcome !== "model") {
      return {
        ...empty(result.outcome, text),
        calls,
        observations,
        steps,
        ignored,
      };
    }

    const call = result.toolCalls[0];
    if (!call) {
      return {
        ...empty("model", text),
        calls,
        observations,
        steps,
        ignored,
      };
    }

    /*
     * The last request was made with tools withheld. A provider that still
     * returns a tool call gets it ignored rather than executed, so the loop can
     * never exceed its budget on the final step.
     */
    if (step === limit - 1) {
      ignored += result.toolCalls.length;
      return {
        ...empty("model", text),
        calls,
        observations,
        steps,
        ignored,
      };
    }

    calls.push(call);
    if (result.toolCalls.length > 1) {
      ignored += result.toolCalls.length - 1;
    }

    let execution: ToolExecution;
    try {
      execution = await execute(call);
    } catch {
      return {
        ...empty("failed", text),
        calls,
        observations,
        steps,
        ignored,
      };
    }

    if (execution.kind === "terminal") {
      return {
        outcome: "model",
        text,
        calls,
        observations,
        terminal: execution.terminal,
        steps,
        ignored,
        failed: false,
      };
    }

    observations.push(execution.observation);
  }

  return {
    ...empty("model", text),
    calls,
    observations,
    steps,
    ignored,
  };
}
