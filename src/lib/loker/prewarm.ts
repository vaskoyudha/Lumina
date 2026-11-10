import "server-only";
import {
  acquireScanLease,
  runLeasedScan,
  type ScanLease,
} from "@/lib/loker/start";
import { latestScanRun } from "@/lib/loker/store";
import type { ScanRunStatus } from "@/lib/loker/types";

/** A healthy corpus is refreshed every six hours. */
export const PREWARM_INTERVAL_MS = 6 * 60 * 60 * 1_000;

/** A failed run is retried after half an hour, not after a whole interval. */
export const PREWARM_RETRY_MS = 30 * 60 * 1_000;

/** How often the scheduler looks at the run table. */
const TICK_MS = 10 * 60 * 1_000;

/** First check after boot, so startup is not blocked by a network crawl. */
const FIRST_TICK_MS = 10 * 1_000;

/**
 * `LOKER_PREWARM_INTERVAL_MS` overrides the refresh cadence.
 *
 * Zero disables prewarm, which is what an environment that must not crawl on
 * its own (a shared CI database, for example) should set.
 */
export function prewarmIntervalMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.LOKER_PREWARM_INTERVAL_MS?.trim();
  if (!raw) return PREWARM_INTERVAL_MS;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : PREWARM_INTERVAL_MS;
}

/**
 * Should the scheduler try to start a scan now?
 *
 * Rules, in order: disabled, never run, age. A `running` row is *not* a reason
 * to skip: the advisory lock is the real guard, and it disappears with the
 * process. That way a server restarted mid-crawl can still warm the corpus
 * instead of blocking on a row nothing is writing anymore. A failed run retries
 * on the shorter interval so one bad crawl does not freeze the corpus for six
 * hours.
 */
export function shouldPrewarm(
  last: Pick<ScanRunStatus, "status" | "finishedAt"> | null,
  now: number,
  intervalMs: number,
  retryMs: number = PREWARM_RETRY_MS,
): boolean {
  if (intervalMs === 0) return false;
  if (!last) return true;
  if (last.status === "running") return true;
  if (!last.finishedAt) return false;

  const finishedAt = Date.parse(last.finishedAt);
  if (!Number.isFinite(finishedAt)) return false;

  const age = now - finishedAt;
  // A future timestamp means clock skew across processes, not staleness.
  if (age < 0) return false;

  return (
    age >=
    (last.status === "failed" ? Math.min(retryMs, intervalMs) : intervalMs)
  );
}

export type PrewarmOutcome = "started" | "skipped" | "busy";

export interface PrewarmDeps {
  latest(): Promise<ScanRunStatus | null>;
  acquire(): Promise<Awaited<ReturnType<typeof acquireScanLease>>>;
  run(lease: ScanLease): Promise<void>;
  now?: () => number;
}

/** One scheduler decision, with every side effect injected for tests. */
export async function prewarmOnce(
  deps: PrewarmDeps,
  intervalMs: number,
): Promise<PrewarmOutcome> {
  const now = deps.now?.() ?? Date.now();
  let last: ScanRunStatus | null;
  try {
    last = await deps.latest();
  } catch {
    return "skipped";
  }
  if (!shouldPrewarm(last, now, intervalMs)) return "skipped";

  let lease: Awaited<ReturnType<typeof acquireScanLease>>;
  try {
    lease = await deps.acquire();
  } catch {
    return "skipped";
  }
  if (!lease.ok) return lease.reason === "running" ? "busy" : "skipped";

  // Detached on purpose: the scheduler must not wait for a multi-minute crawl,
  // and `runLeasedScan` releases the lock even when the job fails.
  void deps.run(lease.lease).catch(() => {});
  return "started";
}

let timer: ReturnType<typeof setInterval> | undefined;

/** Timers must not keep the process alive on their own. */
function unref(handle: unknown): void {
  (handle as { unref?: () => void }).unref?.();
}

/**
 * Start the background prewarm loop. Idempotent.
 *
 * The first check happens shortly after boot (not during `register`, which must
 * return before the server accepts requests), so a fresh deployment warms the
 * corpus before a visitor opens the card.
 */
export function startPrewarm(
  intervalMs: number = prewarmIntervalMs(),
): boolean {
  if (intervalMs === 0 || timer) return false;

  const deps: PrewarmDeps = {
    latest: latestScanRun,
    acquire: () => acquireScanLease("prewarm"),
    run: runLeasedScan,
  };
  const tick = () => {
    prewarmOnce(deps, intervalMs).catch(() => {});
  };

  const first = setTimeout(tick, FIRST_TICK_MS);
  unref(first);
  timer = setInterval(tick, Math.min(intervalMs, TICK_MS));
  unref(timer);
  return true;
}
