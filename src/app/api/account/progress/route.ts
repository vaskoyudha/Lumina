import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { readAccountProgress } from "@/lib/learning/store";

const headers = { "cache-control": "no-store" };

export async function GET() {
  const session = await getSession();
  if (!session)
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers },
    );
  try {
    const [progress, count] = await Promise.all([
      readAccountProgress(session.id),
      authDatabase().query<{ total: number }>(
        "SELECT count(*)::int AS total FROM learning_modules",
      ),
    ]);
    return Response.json(
      { ok: true, progress, moduleCount: count.rows[0].total },
      { headers },
    );
  } catch {
    return Response.json(
      { ok: false, error: "unavailable" },
      { status: 503, headers },
    );
  }
}
