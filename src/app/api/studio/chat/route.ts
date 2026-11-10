import { getSession } from "@/lib/auth/server-session";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";
import { isStudioAllowed } from "@/lib/studio/access";
import { StudioRequestSchema } from "@/lib/studio/contracts";
import {
  runStudioLoop,
  StudioUpstreamError,
  studioResponse,
} from "@/lib/studio/loop";

const DEADLINE_MS = 45_000;

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail(401, "unauthorized");
  if (!isStudioAllowed(session.id)) return fail(403, "forbidden");

  let body: unknown;
  try {
    body = await readJson(request, 65536);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }
  const parsed = StudioRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-request");

  const limited = await limitAI(request, "text");
  if (limited) return limited;

  const upstreamControl = upstreamAbort(request, DEADLINE_MS);
  try {
    const result = await runStudioLoop(parsed.data, {
      userId: session.id,
      userName: session.nama,
      signal: upstreamControl.signal,
    });
    console.info(
      JSON.stringify({
        event: "studio.run",
        user: session.id,
        tools: result.tools.map((tool) => ({
          name: tool.name,
          ok: tool.result.ok,
          ms: tool.ms,
        })),
      }),
    );
    return Response.json(studioResponse(result), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof StudioUpstreamError) {
      return fail(
        error.status === 504 ? 504 : 503,
        error.status === 504 ? "upstream-timeout" : "upstream-failed",
      );
    }
    return fail(503, "upstream-failed");
  } finally {
    upstreamControl.cleanup();
  }
}
