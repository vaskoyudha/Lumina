import {
  type AnswerLane,
  type AnswerRequest,
  AnswerRequestSchema,
} from "@/lib/contracts/answer";
import {
  JOB_SEARCH_TOOL,
  JobSearchArgsSchema,
  REPORT_TOOL,
  ReportDraftArgsSchema,
  type ToolCall,
} from "@/lib/contracts/tool";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/**
 * The conversational lanes.
 *
 * Separate from `/api/companion/voice` on purpose. That route carries findings
 * and is covered by streaming tests that must not be disturbed. This one
 * carries the user's own question, so its schema is a different shape and its
 * system prompt is different per lane.
 *
 * Plan §3b: the model chooses sentences, never findings. It is told what the
 * scheme data says and forbidden from inventing a finding.
 *
 * No segment config: this Next version has `cacheComponents` enabled and
 * rejects `export const runtime` / `export const dynamic`.
 */

/** Shared ceiling. Must stay below the client's 23 s abort. */
const DEADLINE_MS = 20000;

const MAX_TOKENS = 800;

const SHARED = [
  "Kamu adalah Lumina, pendamping yang membantu orang Indonesia memeriksa pesan yang mencurigakan.",
  "Aturan:",
  "a. Bahasa Indonesia, tenang, tidak menghakimi. Jangan pernah menyalahkan korban.",
  "b. Maksimal tiga kalimat. Tanpa salam pembuka, tanpa markdown, tanpa daftar bernomor.",
  "c. Jangan mengarang temuan. Kamu bukan penilai risiko; angka sudah dihitung di perangkat pengguna.",
  "d. Panggil `report_draft` hanya ketika pengguna meminta dibuatkan laporan atau template laporan. Jangan menulis isi laporan sendiri; template disusun di perangkat pengguna.",
];

const SYSTEM: Record<AnswerLane, string> = {
  tanya: [
    ...SHARED,
    "e. Jawab pertanyaannya, bukan pesannya. Pakai hanya fakta di `modules` dan `tactics`.",
    "f. Kalau modul yang ditanyakan tidak ada di daftar, katakan terus terang bahwa modulnya belum ada.",
  ].join("\n"),
  lanjutan: [
    ...SHARED,
    "e. Ini lanjutan dari pemeriksaan sebelumnya. Jawab dari `digest` dan `tactics` saja.",
    "f. Jangan mengulang seluruh hasil; jelaskan bagian yang ditanyakan.",
  ].join("\n"),
  obrolan: [
    ...SHARED,
    "e. Ini obrolan biasa. Jawab dengan hangat dan singkat.",
    "f. Kalau pengguna menyebut pesan yang mencurigakan, ajak menempelkannya untuk diperiksa.",
  ].join("\n"),
};

/**
 * Only the fields this lane needs are forwarded.
 *
 * A single `payloadFor` is what keeps a future field from quietly reaching a
 * lane that must not see it.
 */
function payloadFor(data: AnswerRequest): Record<string, unknown> {
  if (data.lane === "tanya") {
    return {
      question: data.question,
      modules: data.modules,
      tactics: data.tactics,
    };
  }
  if (data.lane === "lanjutan") {
    return {
      question: data.question,
      digest: data.digest,
      tactics: data.tactics,
    };
  }
  return { question: data.question, history: data.history };
}

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
  const parsed = AnswerRequestSchema.safeParse(body);
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
          temperature: 0.4,
          /*
           * Same model and same minimum-thinking floor as the voice route:
           * measured 6.6-10.2 s per turn on the fastest Antigravity account.
           */
          reasoning_effort: "none",
          max_tokens: MAX_TOKENS,
          tools: [JOB_SEARCH_TOOL, REPORT_TOOL],
          tool_choice: "auto",
          messages: [
            { role: "system", content: SYSTEM[parsed.data.lane] },
            {
              role: "user",
              content: JSON.stringify(payloadFor(parsed.data)),
            },
          ],
        }),
      },
    );

    if (!upstream.ok) return fail(503, "upstream-failed");

    const json = (await upstream.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
      }[];
    };
    const message = json.choices?.[0]?.message;
    const text = message?.content?.trim() ?? "";

    const toolCalls: ToolCall[] = [];
    for (const call of message?.tool_calls ?? []) {
      if (call.type && call.type !== "function") continue;
      const name = call.function?.name;
      if (name !== "job_search" && name !== "report_draft") continue;
      let raw: unknown;
      try {
        raw = JSON.parse(call.function?.arguments ?? "");
      } catch {
        continue;
      }
      /*
       * Two tools, two schemas. Neither accepts a message, a verdict, or a
       * report body, so a model that tries to smuggle the checked text gets the
       * call dropped instead of forwarded.
       */
      if (name === "job_search") {
        const parsedArgs = JobSearchArgsSchema.safeParse(raw);
        if (!parsedArgs.success) continue;
        toolCalls.push({
          id: call.id ?? "",
          name: "job_search",
          arguments: parsedArgs.data,
        });
        continue;
      }
      const parsedArgs = ReportDraftArgsSchema.safeParse(raw);
      if (!parsedArgs.success) continue;
      toolCalls.push({
        id: call.id ?? "",
        name: "report_draft",
        arguments: parsedArgs.data,
      });
    }

    if (text.length === 0 && toolCalls.length === 0) {
      return fail(503, "upstream-empty");
    }

    return Response.json({ ok: true, text, toolCalls });
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return fail(503, aborted ? "upstream-timeout" : "upstream-unreachable");
  } finally {
    upstreamControl.cleanup();
  }
}
