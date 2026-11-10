import type { ReportPolishRequest } from "@/lib/contracts/report";

/**
 * Browser side of the report polish.
 *
 * Never throws, like the other companion clients: an offline venue is the
 * expected case and the deterministic draft is always available.
 */

/** Every `[BLANK]` in the original must still be in the polished text. */
export function keepsBlanks(original: string, polished: string): boolean {
  const blanks = original.match(/\[[^\]]+\]/g) ?? [];
  return blanks.every((blank) => polished.includes(blank));
}

export async function requestReportPolish(
  input: ReportPolishRequest,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl("/api/companion/tools/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (text.length === 0) return null;
    return keepsBlanks(input.draft.body, text) ? text : null;
  } catch {
    return null;
  }
}
