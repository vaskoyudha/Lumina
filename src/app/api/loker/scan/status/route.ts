import { connection } from "next/server";
import { countPostings, latestScanRun } from "@/lib/loker/store";

/**
 * Poll target for the tool card. Public: it carries no user data.
 *
 * `postings` lets the card notice rows landing mid-scan, so it can refresh
 * without waiting for the run row to settle.
 */
export async function GET() {
  await connection();
  const [run, postings] = await Promise.all([
    latestScanRun().catch(() => null),
    countPostings().catch(() => 0),
  ]);
  if (!run) return new Response(null, { status: 204 });
  return Response.json(
    { ...run, postings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
