import { isIP } from "node:net";
import { AuthError, consumeAttempt } from "@/lib/auth/accounts";

/** Only trust the header overwritten by our isolated reverse proxy. */
export function clientKey(request: Request): string {
  const ip = request.headers.get("x-lumina-client-ip")?.trim() ?? "";
  return process.env.TRUST_PROXY === "true" && isIP(ip) ? ip : "anonymous";
}

export interface RequestMeta {
  userAgent: string | null;
  clientIp: string | null;
}

/** Account metadata for the session list; the IP is proxy-trusted only. */
export function requestMeta(headers: Pick<Headers, "get">): RequestMeta {
  const userAgent = headers.get("user-agent")?.trim() ?? "";
  const ip = headers.get("x-lumina-client-ip")?.trim() ?? "";
  return {
    userAgent: userAgent ? userAgent.slice(0, 300) : null,
    clientIp: process.env.TRUST_PROXY === "true" && isIP(ip) ? ip : null,
  };
}
export async function limitAI(
  request: Request,
  kind: "text" | "vision",
): Promise<Response | null> {
  const configured = Number(process.env.LUMINA_AI_GLOBAL_LIMIT ?? 200);
  const globalLimit =
    Number.isSafeInteger(configured) && configured > 0 ? configured : 200;
  try {
    await consumeAttempt(`ai:global`, globalLimit, 60000);
    await consumeAttempt(
      `ai:${kind}:${clientKey(request)}`,
      kind === "text" ? 10 : 3,
      60000,
    );
    return null;
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof AuthError ? "rate-limited" : "unavailable",
      },
      { status: error instanceof AuthError ? 429 : 503 },
    );
  }
}
export class BodyTooLarge extends Error {}
export async function readJson(
  request: Request,
  max: number,
): Promise<unknown> {
  const size = Number(request.headers.get("content-length"));
  if (Number.isFinite(size) && size > max) throw new BodyTooLarge();
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        throw new BodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(data));
  } catch {
    return null;
  }
}
export function upstreamAbort(request: Request, timeout: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (request.signal.aborted) abort();
  else request.signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeout);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abort);
    },
    abort,
  };
}
