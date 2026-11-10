import type { Explanation } from "@/lib/companion/explain";
import type { VoiceDigest } from "@/lib/contracts/agent-run";
import type {
  AnswerAttachment,
  AnswerLane,
  AnswerRequest,
} from "@/lib/contracts/answer";
import { type ToolCall, ToolCallSchema } from "@/lib/contracts/tool";
import { MODUS } from "@/lib/modus";

/**
 * Browser side of the conversational lanes.
 *
 * Never throws, for the same reason `requestReply` never throws: an offline
 * venue is the expected case, and the caller always has a fallback sentence.
 */

export type AnswerOutcome = "model" | "timeout" | "unconfigured" | "failed";

export interface AnswerResult {
  outcome: AnswerOutcome;
  text: string;
  toolCalls: ToolCall[];
}

/** Public scheme facts. No user content can enter this array. */
const MODULE_FACTS = MODUS.map((modus) => ({
  no: modus.no,
  nama: modus.nama,
  ciri: modus.ciri,
}));

/**
 * Project the explanation down to its public half.
 *
 * `TacticExplained.evidence` is a verbatim quote from the user's message, so it
 * is dropped here rather than trusted to stay unread downstream.
 */
function tacticFacts(explanation: Explanation | null) {
  if (!explanation) return [];
  return explanation.tactics.map((tactic) => ({
    nama: tactic.nama,
    cara: tactic.cara,
    tanda: tactic.tanda,
    pembeda: tactic.pembeda,
  }));
}

export function buildAnswerRequest(
  lane: AnswerLane,
  question: string,
  state: {
    history: { role: "user" | "companion"; text: string }[];
    digest: VoiceDigest | null;
    explanation: Explanation | null;
    contentQuestion?: boolean;
    attachmentContext?: AnswerAttachment[];
    hasVerdict?: boolean;
    /** Set only when the reader tapped the link confirmation card. */
    linkApproved?: string;
    /** Signed-in display name; the only profile field the model sees. */
    userName?: string;
  },
): AnswerRequest {
  const contentQuestion = lane !== "belajar" && state.contentQuestion === true;
  return {
    lane,
    question,
    history: lane === "belajar" ? [] : state.history.slice(-10),
    digest: lane === "lanjutan" ? state.digest : null,
    modules: lane === "belajar" ? [] : MODULE_FACTS,
    tactics:
      lane === "tanya" || lane === "lanjutan"
        ? tacticFacts(state.explanation)
        : [],
    contentQuestion,
    attachmentContext:
      contentQuestion && state.attachmentContext
        ? state.attachmentContext.slice(0, 3)
        : [],
    hasVerdict: state.hasVerdict === true,
    linkApproved: lane === "tanya" ? state.linkApproved : undefined,
    userName: state.userName?.trim() || undefined,
    observations: [],
    final: false,
  };
}

function outcomeFor(code: string): AnswerOutcome {
  if (code === "not-configured") return "unconfigured";
  if (code === "upstream-timeout") return "timeout";
  return "failed";
}

export async function requestAnswer(
  payload: AnswerRequest,
  signal?: AbortSignal,
): Promise<AnswerResult> {
  try {
    const response = await fetch("/api/companion/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let code = "";
      try {
        code = ((await response.json()) as { error?: string }).error ?? "";
      } catch {
        code = "";
      }
      return { outcome: outcomeFor(code), text: "", toolCalls: [] };
    }

    const body = (await response.json()) as {
      text?: string;
      toolCalls?: unknown;
    };
    const text = body.text?.trim() ?? "";
    const toolCalls = Array.isArray(body.toolCalls)
      ? body.toolCalls.flatMap((raw) => {
          const parsed = ToolCallSchema.safeParse(raw);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
    if (text.length === 0 && toolCalls.length === 0) {
      return { outcome: "failed", text: "", toolCalls: [] };
    }
    return { outcome: "model", text, toolCalls };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return { outcome: aborted ? "timeout" : "failed", text: "", toolCalls: [] };
  }
}
