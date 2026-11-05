import type { VoiceDigest } from "@/lib/contracts/agent-run";

/**
 * Why the language layer did or did not produce the words.
 *
 * A boolean was not enough. "The model was never configured" and "the model
 * was too slow" both used to collapse into one `false`, and the UI then told
 * the reader the model was not configured even when it was — which is exactly
 * how a working setup comes to look hardcoded.
 */
export type VoiceOutcome =
  | "model"
  | "truncated"
  | "unconfigured"
  | "timeout"
  | "failed";

export interface VoiceResult {
  outcome: VoiceOutcome;
  /** Text received, already streamed to `onChunk`. Empty on every failure. */
  text: string;
}

/**
 * Did the model actually finish its sentence?
 *
 * The upstream stream closes early often enough to matter: measured replies
 * ended mid-word at 54, 56 and 107 characters ("...indikasi mencurig",
 * "...admin atau be"). `streamChatText` passes along what it received, which is
 * correct for a transport, but a half-sentence is not an answer — rendering one
 * looks like a bug to the reader and teaches nothing.
 *
 * A finished Indonesian sentence ends in terminal punctuation or a closing
 * quote/bracket. Anything else is treated as cut off, and the caller falls back
 * to the template, which is always a complete thought.
 */
const FINISHED = /[.!?…"”'’)\]]\s*$/;

function isComplete(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 15 && FINISHED.test(trimmed);
}

/** Map the route's error code onto the outcome the trace should report. */
function outcomeFor(code: string): VoiceOutcome {
  if (code === "not-configured") return "unconfigured";
  if (code === "upstream-timeout") return "timeout";
  return "failed";
}

async function readErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "";
  } catch {
    return "";
  }
}

/**
 * Browser side of the language layer.
 *
 * Never throws. The caller always has `composeReply()` available, and a
 * rejected promise here would take a whole turn down for a cosmetic reason —
 * an offline venue is the expected case, not an exceptional one.
 */
export async function requestReply(
  digest: VoiceDigest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<VoiceResult> {
  try {
    const response = await fetch("/api/companion/voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(digest),
      signal,
    });

    if (!response.ok) {
      return { outcome: outcomeFor(await readErrorCode(response)), text: "" };
    }
    if (!response.body) return { outcome: "failed", text: "" };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk.length === 0) continue;
      text += chunk;
      onChunk(chunk);
    }

    // Flush whatever the decoder held back mid-character.
    const tail = decoder.decode();
    if (tail.length > 0) {
      text += tail;
      onChunk(tail);
    }

    // An empty stream is a failure, not a silent blank answer. A stream that
    // stops mid-word is a truncated answer, not a short one.
    if (text.trim().length === 0) return { outcome: "failed", text: "" };
    if (!isComplete(text)) return { outcome: "truncated", text: "" };
    return { outcome: "model", text };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return { outcome: aborted ? "timeout" : "failed", text: "" };
  }
}
