import { z } from "zod";
import { AuthError, consumeAttempt } from "@/lib/auth/accounts";
import { LinkVerifyError, verifyLink } from "@/lib/link-verify/urlvet";
import {
  BodyTooLarge,
  clientKey,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/**
 * Verify one link against a url.vet-compatible scanner.
 *
 * The body carries the URL only — never the message. The caller (the Link
 * Agent row) asks for this explicitly, so a link leaves the device only after
 * the reader presses "Periksa tautan".
 */

const BodySchema = z.object({
  url: z
    .string()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), "invalid-url"),
});

/** url.vet scans for 1–15 s; the client waits 20 s before giving up. */
const DEADLINE_MS = 20000;
const LIMIT_PER_MINUTE = 6;

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 4096);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-request");

  try {
    await consumeAttempt(
      `link:verify:${clientKey(request)}`,
      LIMIT_PER_MINUTE,
      60000,
    );
  } catch (error) {
    return fail(
      error instanceof AuthError ? 429 : 503,
      error instanceof AuthError ? "rate-limited" : "unavailable",
    );
  }

  const control = upstreamAbort(request, DEADLINE_MS);
  try {
    const verdict = await verifyLink(parsed.data.url, control.signal);
    return Response.json(
      { ok: true, verdict },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof LinkVerifyError) {
      if (error.code === "disabled") return fail(503, "not-configured");
      if (error.code === "timeout") return fail(504, "upstream-timeout");
      return fail(
        503,
        error.code === "invalid" ? "upstream-invalid" : "upstream-failed",
      );
    }
    return fail(503, "upstream-failed");
  } finally {
    control.cleanup();
  }
}
