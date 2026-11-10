import { OrchestratorRequestSchema } from "@/lib/contracts/orchestrator";
import {
  isOrchestratorEnabled,
  orchestratorDeadlineMs,
} from "@/lib/orchestrator/flag";
import { runOrchestrator } from "@/lib/orchestrator/loop";
import { BodyTooLarge, limitAI, readJson } from "@/lib/server/request";

/**
 * The real multi-agent route. It is deliberately separate from
 * `/api/companion/answer`: the old route is the rollback path and its strict
 * contract must stay byte-identical.
 */
export async function POST(request: Request) {
  if (!isOrchestratorEnabled()) {
    return Response.json({ ok: false, error: "not-enabled" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await readJson(request, 262_144);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof BodyTooLarge ? "too-large" : "invalid-request",
      },
      { status: error instanceof BodyTooLarge ? 413 : 400 },
    );
  }

  const parsed = OrchestratorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "invalid-request" },
      { status: 400 },
    );
  }

  const limited = await limitAI(request, "text");
  if (limited) return limited;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), orchestratorDeadlineMs());
  const onAbort = () => controller.abort();
  request.signal.addEventListener("abort", onAbort, { once: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controllerStream) {
      const send = (event: unknown) => {
        controllerStream.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };
      void runOrchestrator(parsed.data, {
        signal: controller.signal,
        onEvent: send,
      })
        .then(() => {
          controllerStream.enqueue(encoder.encode("data: [DONE]\n\n"));
        })
        .catch((error: unknown) => {
          send({
            type: "error",
            message:
              error instanceof Error ? error.message.slice(0, 600) : "failed",
          });
        })
        .finally(() => {
          clearTimeout(timer);
          request.signal.removeEventListener("abort", onAbort);
          try {
            controllerStream.close();
          } catch {
            /* client already closed */
          }
        });
    },
    cancel() {
      controller.abort();
      clearTimeout(timer);
      request.signal.removeEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
