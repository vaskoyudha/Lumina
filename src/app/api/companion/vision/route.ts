import { VisionRequestSchema } from "@/lib/contracts/vision";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/**
 * Image transcription — the only route that receives pixels.
 *
 * It returns visible text, nothing else. The verdict is computed afterwards, on
 * the device, by `src/lib/scoring/score.ts`; this route has no field for a
 * score and is never asked for one.
 *
 * Plan §11.6a allows conversation to reach the model with a permanent notice.
 * The composer carries that notice under the field. A failure here degrades to
 * the filename-only check the app already performed.
 */

/** 20 s, matching the voice lane. Measured 10.4 s on the fast account. */
const TIMEOUT_MS = 20000;

const MAX_TOKENS = 2000;

const SYSTEM = [
  "Kamu adalah pembaca gambar, bukan penilai.",
  "Tugasmu hanya menyalin teks yang terlihat pada gambar.",
  "Aturan:",
  "a. Pertahankan tautan, nomor telepon, nominal, dan nama berkas persis seperti yang tertulis.",
  "b. Jangan menilai, jangan menyimpulkan, jangan menambah teks yang tidak ada.",
  "c. Kalau tidak ada teks yang terbaca, balas tepat: TIDAK ADA TEKS.",
  "d. Tanpa salam pembuka, tanpa markdown, tanpa komentar.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("")
    .trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 8100000);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }
  const parsed = VisionRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-image");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const { mediaType, data } = parsed.data.image;
  const limited = await limitAI(request, "vision");
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
          stream: false,
          temperature: 0.1,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: [
                { type: "text", text: "Salin semua teks pada gambar ini." },
                {
                  type: "image_url",
                  image_url: { url: `data:${mediaType};base64,${data}` },
                },
              ],
            },
          ],
        }),
      },
    );

    if (!upstream.ok) return fail(503, "upstream-failed");

    const payload = (await upstream.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    } | null;
    const text = textFromContent(payload?.choices?.[0]?.message?.content);

    if (text.length === 0) return fail(502, "empty-transcription");

    return Response.json({ ok: true, text: text.slice(0, 6000) });
  } catch {
    return fail(503, "upstream-unreachable");
  } finally {
    upstreamControl.cleanup();
  }
}
