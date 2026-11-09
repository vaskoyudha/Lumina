import type { ScanRunStatus } from "@/lib/loker/types";

export type TriggerResult = "started" | "running" | "unauthorized" | "failed";

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
  onTick: (status: ScanRunStatus) => void,
  options: PollOptions = {},
): Promise<ScanRunStatus | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const intervalMs = options.intervalMs ?? 3_000;
  const maxTicks = options.maxTicks ?? 100;

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

    const status = (await response.json()) as ScanRunStatus;
    onTick(status);
    if (status.status !== "running") return status;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
