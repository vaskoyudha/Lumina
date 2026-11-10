import { ReportPolishRequestSchema } from "@/lib/contracts/report";
import { fetchChat } from "@/lib/server/llm";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/** Must stay below the client's 23 s abort. */
const DEADLINE_MS = 20000;

const MAX_TOKENS = 600;

const SYSTEM = [
  "Kamu adalah Lumina, pendamping yang membantu korban penipuan menyiapkan laporan.",
  "Tulis ulang draf laporan agar lebih tenang dan jelas, dalam Bahasa Indonesia.",
  "Pertahankan setiap penanda dalam kurung siku persis seperti aslinya, misalnya [NAMA ANDA].",
  "Jangan menambah nama, nomor, jumlah uang, tanggal, pasal, atau klaim hukum apa pun.",
  "Jangan menilai risiko dan jangan menyebut skor.",
  "Maksimal 140 kata. Tanpa markdown, tanpa daftar bernomor, tanpa salam pembuka.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

/**
 * Rewrites the deterministic draft's tone only.
 *
 * The request schema has no field for the checked message, its quotes, or the
 * score, so "the message never leaves the device" is structural, not a promise
 * in the prompt.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 65536);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }
  const parsed = ReportPolishRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-request");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const limited = await limitAI(request, "text");
  if (limited) return limited;
  const upstreamControl = upstreamAbort(request, DEADLINE_MS);

  try {
    const upstream = await fetchChat({
      base,
      apiKey: process.env.LUMINA_LLM_KEY,
      model,
      fallbackModel: process.env.LUMINA_LLM_FALLBACK_MODEL,
      signal: upstreamControl.signal,
      body: {
        stream: false,
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(parsed.data) },
        ],
      },
    });

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
