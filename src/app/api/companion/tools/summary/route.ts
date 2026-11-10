import { ToolSummaryRequestSchema } from "@/lib/contracts/tool";
import { ringkasRekomendasi } from "@/lib/loker/verdict";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/** Must stay below the client's 21 s summary abort. */
const DEADLINE_MS = 20000;

const MAX_TOKENS = 160;

const SYSTEM = [
  "Kamu adalah Lumina, pendamping pencari kerja di Indonesia.",
  "Kamu menerima daftar lowongan yang sudah disaring di perangkat pengguna, beserta field rekomendasi yang sudah dihitung Lumina dari dua penilaiannya.",
  "Tulis tepat satu kalimat Bahasa Indonesia yang menyebut jumlah lowongan, rekomendasi keselamatannya (misalnya 'semuanya aman dilamar' atau '3 perlu diperiksa'), dan bila ada satu posisi atau perusahaan yang paling relevan.",
  "Rekomendasi pada field rekomendasi adalah keputusan engine: ulangi apa adanya. Jangan menilai ulang, jangan menambah temuan, jangan menyebut skor, dan jangan mengarang lowongan yang tidak ada di daftar.",
  "Tanpa salam, tanpa markdown, tanpa daftar.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

/**
 * Phase 2: one sentence about the postings the client already filtered.
 *
 * The request schema has no field for the query, a description, an apply URL,
 * or the saved list, so "the query never leaves the device" is structural.
 * Same posture as `/answer`: no session required, rate-limited, 20 s deadline.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 65536);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }
  const parsed = ToolSummaryRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-request");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const limited = await limitAI(request, "text");
  if (limited) return limited;
  const upstreamControl = upstreamAbort(request, DEADLINE_MS);

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
          temperature: 0.3,
          reasoning_effort: "none",
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              // The aggregate is derived here, from the two verdict fields the
              // contract already allows, so the schema stays frozen.
              content: JSON.stringify({
                ...parsed.data,
                rekomendasi: ringkasRekomendasi(parsed.data.postings),
              }),
            },
          ],
        }),
      },
    );

    if (!upstream.ok) return fail(503, "upstream-failed");

    const json = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (text.length === 0) return fail(503, "upstream-empty");

    return Response.json({ ok: true, text });
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return fail(503, aborted ? "upstream-timeout" : "upstream-unreachable");
  } finally {
    upstreamControl.cleanup();
  }
}
