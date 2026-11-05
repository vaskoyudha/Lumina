import { streamChatText } from "@/lib/companion/voice-stream";
import { VoiceDigestSchema } from "@/lib/contracts/agent-run";

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

/*
 * 20s, not 6s.
 *
 * Measured on this machine through the Satu 9Router tunnel, DeepSeek V4.1
 * Flash takes 2.5s on a good call and 6.1s on a slow one. A 6s budget
 * therefore aborted real replies and silently swapped in the template, which
 * is exactly the "the agent is hardcoded" symptom: the same message produced a
 * model answer or a template answer depending on network luck.
 *
 * The number is a runaway guard, not a latency target. A judge waiting eight
 * seconds for a real reply is a better outcome than an instant canned one, and
 * the thinking row counts the wait out loud so it reads as work.
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
  "e. Kalau risikonya tinggi, sarankan berhenti bertindak dan membuka mode darurat.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VoiceDigestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-digest");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `${base.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: controller.signal,
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
          max_tokens: 220,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify(parsed.data) },
          ],
        }),
      },
    );

    if (!upstream.ok || !upstream.body) return fail(503, "upstream-failed");

    return new Response(streamChatText(upstream.body), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    clearTimeout(timer);
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
  /*
   * Deliberately NOT clearing the timer on the success path.
   *
   * `streamChatText` keeps reading after this function returns, so clearing
   * here would disarm the only guard the stream has: a stalled upstream would
   * then stream forever. Letting the timer fire aborts a fetch that has already
   * been consumed, which is a no-op, so the cost of leaving it armed is nil and
   * the ceiling it provides is real.
   */
}
