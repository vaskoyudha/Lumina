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

const TIMEOUT_MS = 6000;

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
  } catch {
    return fail(503, "upstream-unreachable");
  } finally {
    clearTimeout(timer);
  }
}
