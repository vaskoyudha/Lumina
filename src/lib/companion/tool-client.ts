import type { ToolSummaryRequest } from "@/lib/contracts/tool";

/**
 * Browser side of the phase-2 summary.
 *
 * Never throws, like the other companion clients: an offline venue is the
 * expected case, and the chat always has deterministic copy to fall back to.
 * The payload is built by the caller from `ToolSummaryRequestSchema`, so no
 * query and no description can be added here by accident.
 */
export async function requestToolSummary(
  input: ToolSummaryRequest,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl("/api/companion/tools/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
