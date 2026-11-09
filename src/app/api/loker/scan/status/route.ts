import { connection } from "next/server";
import { latestScanRun } from "@/lib/loker/store";

/** Poll target for the tool card. Public: it carries no user data. */
export async function GET() {
  await connection();
  const run = await latestScanRun().catch(() => null);
  if (!run) return new Response(null, { status: 204 });
  return Response.json(run, {
    headers: { "Cache-Control": "no-store" },
  });
}
