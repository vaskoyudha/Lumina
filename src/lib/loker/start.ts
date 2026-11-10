import "server-only";
import type { PoolClient } from "pg";
import { authDatabase } from "@/lib/auth/database";
import { runScanJob } from "@/lib/loker/run";
import { startScanRun } from "@/lib/loker/store";

const UNLOCK_SQL = "select pg_advisory_unlock(hashtext('loker_scan'))";
const TRY_LOCK_SQL =
  "select pg_try_advisory_lock(hashtext('loker_scan')) as ok";

/**
 * A started scan, plus the pool connection holding its advisory lock.
 *
 * The lock lives on a dedicated connection until the job finishes, so a second
 * trigger gets an honest `running` answer instead of starting a second crawl.
 */
export interface ScanLease {
  runId: number;
  release(): Promise<void>;
}

export type LeaseResult =
  | { ok: true; lease: ScanLease }
  | { ok: false; reason: "running" | "unavailable" };

/** Start a run and take the lock, or explain why it cannot start. */
export async function acquireScanLease(
  triggeredBy: string | null,
): Promise<LeaseResult> {
  let client: PoolClient;
  try {
    client = await authDatabase().connect();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const lock = await client.query<{ ok: boolean }>(TRY_LOCK_SQL);
    if (!lock.rows[0]?.ok) {
      client.release();
      return { ok: false, reason: "running" };
    }
  } catch {
    client.release();
    return { ok: false, reason: "unavailable" };
  }

  let runId: number;
  try {
    runId = await startScanRun(triggeredBy);
  } catch {
    await client.query(UNLOCK_SQL).catch(() => {});
    client.release();
    return { ok: false, reason: "unavailable" };
  }

  let released = false;
  return {
    ok: true,
    lease: {
      runId,
      async release() {
        // `release` is called from a request scope and from the scheduler; a
        // second call must not unlock a connection another run may now own.
        if (released) return;
        released = true;
        await client.query(UNLOCK_SQL).catch(() => {});
        client.release();
      },
    },
  };
}

/** Run one leased scan to completion. Never throws. */
export async function runLeasedScan(lease: ScanLease): Promise<void> {
  try {
    await runScanJob(lease.runId);
  } finally {
    await lease.release();
  }
}
