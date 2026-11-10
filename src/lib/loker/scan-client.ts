import type { ScanStatus } from "@/lib/loker/types";

export type TriggerResult =
  | "started"
  | "running"
  | "unauthorized"
  | "rate-limited"
  | "failed";

/** Ask the server to start a scan. Never throws. */
export async function triggerScan(
  fetchImpl: typeof fetch = fetch,
): Promise<TriggerResult> {
  try {
    const response = await fetchImpl("/api/loker/scan", { method: "POST" });
    if (response.status === 202) return "started";
    if (response.status === 409) return "running";
    if (response.status === 401 || response.status === 403) {
      return "unauthorized";
    }
    if (response.status === 429) return "rate-limited";
    return "failed";
  } catch {
    return "failed";
  }
}

export interface PollOptions {
  fetchImpl?: typeof fetch;
  intervalMs?: number;
  maxTicks?: number;
}

/**
 * Poll the latest run until it settles.
 *
 * A 204 means no run has ever been recorded; that is a valid empty state, not
 * an error, so it returns null rather than throwing.
 */
export async function pollScan(
  onTick: (status: ScanStatus) => void,
  options: PollOptions = {},
): Promise<ScanStatus | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const intervalMs = options.intervalMs ?? 3_000;
  // The scanner alone may take five minutes, and ingest runs after it. A cold
  // corpus needs the whole budget, so a short poll must not declare failure
  // while the job is still writing rows.
  const maxTicks = options.maxTicks ?? 200;

  for (let tick = 0; tick < maxTicks; tick += 1) {
    let response: Response;
    try {
      response = await fetchImpl("/api/loker/scan/status", {
        cache: "no-store",
      });
    } catch {
      return null;
    }
    if (response.status === 204) return null;
    if (!response.ok) return null;

    const status = (await response.json()) as ScanStatus;
    onTick(status);
    if (status.status !== "running") return status;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
