import { after } from "next/server";
import type { PoolClient } from "pg";
import { AuthError, consumeAttempt } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { runScanJob } from "@/lib/loker/run";
import { startScanRun } from "@/lib/loker/store";
import { clientKey } from "@/lib/server/request";

/**
 * Start a background scan.
 *
 * The advisory lock is held on a dedicated pool connection until the job
 * finishes, so a second trigger gets an honest 409 instead of a second scan.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await consumeAttempt(`loker:scan:${clientKey(request)}`, 1, 600_000);
  } catch (error) {
    const limited = error instanceof AuthError;
    return Response.json(
      { ok: false, error: limited ? "rate-limited" : "unavailable" },
      { status: limited ? 429 : 503 },
    );
  }

  let client: PoolClient;
  try {
    client = await authDatabase().connect();
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  try {
    const lock = await client.query<{ ok: boolean }>(
      "select pg_try_advisory_lock(hashtext('loker_scan')) as ok",
    );
    if (!lock.rows[0]?.ok) {
      client.release();
      return Response.json(
        { ok: false, error: "scan-running" },
        { status: 409 },
      );
    }
  } catch {
    client.release();
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  let runId: number;
  try {
    runId = await startScanRun(session.email);
  } catch {
    await client
      .query("select pg_advisory_unlock(hashtext('loker_scan'))")
      .catch(() => {});
    client.release();
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  after(async () => {
    try {
      await runScanJob(runId);
    } finally {
      await client
        .query("select pg_advisory_unlock(hashtext('loker_scan'))")
        .catch(() => {});
      client.release();
    }
  });

  return Response.json({ ok: true, runId }, { status: 202 });
}
