import { after } from "next/server";
import { AuthError, consumeAttempt } from "@/lib/auth/accounts";
import { getSession } from "@/lib/auth/server-session";
import { acquireScanLease, runLeasedScan } from "@/lib/loker/start";
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

  const lease = await acquireScanLease(session.email);
  if (!lease.ok) {
    return Response.json(
      {
        ok: false,
        error: lease.reason === "running" ? "scan-running" : "unavailable",
      },
      { status: lease.reason === "running" ? 409 : 503 },
    );
  }

  after(() => runLeasedScan(lease.lease));

  return Response.json({ ok: true, runId: lease.lease.runId }, { status: 202 });
}
