import { streamChatText } from "@/lib/companion/voice-stream";
import { VoiceDigestSchema } from "@/lib/contracts/agent-run";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/**
 * The language layer.
 *
 * It receives findings, never the message. `VoiceDigestSchema` has no field for
 * a quote, and `.strict()` rejects a request that carries one, so the privacy
 * promise in plan §11.6a is enforced here rather than trusted.
 *
 * Any OpenAI-compatible endpoint works, configured entirely by environment.
 * Unset, failing, or slow means 503 and the client falls back to
 * `composeReply()` — plan §3c: the demo must not depend on a live third party.
 *
 * Plan §3b: the model chooses sentences, never findings. It is never asked for
 * a score, never sees the score's inputs beyond the digest, and cannot move the
 * verdict, which was already decided before this handler was called.
 */

/*
 * No segment config here on purpose. This Next version has
 * `cacheComponents` enabled, and it rejects `export const runtime` and
 * `export const dynamic` with "not compatible with nextConfig.cacheComponents".
 * Neither is needed: a POST handler that reads a request body is never
 * cached, and Node is already the default runtime. Unit tests could not catch
 * this — they import POST directly and never run the route compiler.
 */

/**
 * 20 s. Gemini 3.8 Flash is a thinking model: even at its lowest thinking
 * level it spends ~600-950 `reasoning_tokens` before the first visible
 * character. Measured 6.6-10.2 s per turn on the fastest Antigravity account,
 * and 25-45 s on the accounts that used to be tried first.
 *
 * The client aborts at 23 s, above this, so the server is always the one that
 * gives up first — otherwise it streams into a turn that has already been
 * sealed and shown as a template.
 */
const TIMEOUT_MS = 20000;

const SYSTEM = [
  "Kamu adalah Lumina, pendamping yang membantu orang Indonesia memeriksa pesan yang mencurigakan.",
  "Kamu menerima HASIL PEMERIKSAAN, bukan isi pesan pengguna. Jangan pernah mengaku membaca pesannya.",
  "Aturan:",
  "a. Bahasa Indonesia, tenang, tidak menghakimi. Jangan pernah menyalahkan korban.",
  "b. Sebutkan temuan terkuat dengan kalimatnya sendiri.",
  "c. Jangan menambah temuan yang tidak ada di daftar. Jangan menyebut sesuatu aman melebihi temuan.",
  "d. Maksimal tiga kalimat. Tanpa salam pembuka, tanpa markdown, tanpa daftar bernomor.",
  "e. Kalau risikonya tinggi, sarankan menghentikan komunikasi dan menghubungi bank atau penyedia akun melalui kanal resmi dari perangkat lain yang aman.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 65536);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }
  const parsed = VoiceDigestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-digest");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const limited = await limitAI(request, "text");
  if (limited) return limited;
  const upstreamControl = upstreamAbort(request, TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `${base.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: upstreamControl.signal,
        headers: {
          "content-type": "application/json",
          ...(process.env.LUMINA_LLM_KEY
            ? { authorization: `Bearer ${process.env.LUMINA_LLM_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.3,
          /*
           * Maps to the model's minimum thinking level. It cannot be turned
           * off for Gemini 3.8 Flash: `reasoning_tokens` stay at 600-950
           * whether this field is present or not, which is why the timeout,
           * not the prompt, is what keeps a demo turn inside the deadline.
           */
          reasoning_effort: "none",
          /*
           * 800, measured. This model is a reasoning model and
           * `reasoning_tokens` are billed inside `completion_tokens`, so a 220
           * cap is 220 minus 54-206 tokens of thinking. Measured: 40 -> 0
           * visible characters, 80 -> 85 cut mid-word, 220 -> sometimes cut,
           * 800 -> 359 characters with `finish_reason: "stop"`. 1600 was
           * proposed and rejected: it buys more thinking on the critical path,
           * not a longer answer.
           */
          max_tokens: 800,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify(parsed.data) },
          ],
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      upstreamControl.cleanup();
      return fail(503, "upstream-failed");
    }

    return new Response(
      streamChatText(upstream.body, () => {
        upstreamControl.abort();
        upstreamControl.cleanup();
      }),
      {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    upstreamControl.cleanup();
    /*
     * A timeout and an unreachable endpoint are different failures and must not
     * share a message. Reporting "not configured" for a slow model is what made
     * a working setup look hardcoded.
     */
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return fail(503, aborted ? "upstream-timeout" : "upstream-unreachable");
  }
}
