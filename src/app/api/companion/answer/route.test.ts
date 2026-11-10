/** @jest-environment node */
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn().mockResolvedValue(undefined),
  AuthError: class AuthError extends Error {},
}));

import { POST } from "@/app/api/companion/answer/route";
/**
 * @jest-environment node
 */
import { consumeAttempt } from "@/lib/auth/accounts";
import { AnswerRequestSchema } from "@/lib/contracts/answer";

const QUESTION =
  "apa itu pinjol? soalnya tetangga saya dapat tawaran pinjaman lewat WhatsApp";

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AnswerRequestSchema · the privacy boundary is structural", () => {
  it("accepts a question with no checks attached", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "tanya",
      question: "apa itu pinjol?",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a top-level field that could carry the received message", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "tanya",
      question: "apa itu pinjol?",
      message: "Halo, ini dari BCA. Akun Anda diblokir.",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects evidence inside a nested object", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "lanjutan",
      question: "kenapa berbahaya?",
      digest: {
        risk: "tinggi",
        score: 80,
        modusName: "Pinjol fiktif",
        findings: [
          { label: "Menawarkan pinjaman", weight: 0.8, evidence: "kutipan" },
        ],
        advice: ["Jangan transfer"],
        moduleNo: 9,
        locale: "id",
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("POST /api/companion/answer", () => {
  const env = process.env;

  beforeEach(() => {
    jest.mocked(consumeAttempt).mockResolvedValue(undefined);
    process.env = {
      ...env,
      LUMINA_LLM_URL: "http://llm.test/v1",
      LUMINA_LLM_MODEL: "test-model",
    };
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it("preserves conversational context without offering unrelated tools", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Pinjol adalah pinjaman ilegal." } }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({
        lane: "tanya",
        question: QUESTION,
        history: [
          { role: "user", text: "Saya ingin belajar mengenali penipuan." },
        ],
      }),
    );
    const body = (await response.json()) as { ok: boolean; text: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      text: "Pinjol adalah pinjaman ilegal.",
      toolCalls: [],
    });

    const sent = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(sent).toContain("apa itu pinjol?");
    const payload = JSON.parse(sent) as {
      tools?: unknown;
      messages: { content: string }[];
    };
    expect(payload.tools).toBeUndefined();
    expect(JSON.parse(payload.messages[1]?.content ?? "{}").history).toEqual([
      { role: "user", text: "Saya ingin belajar mengenali penipuan." },
    ]);
  });

  it("rejects an unknown field instead of ignoring it", async () => {
    const response = await POST(
      request({ lane: "tanya", question: "apa itu pinjol?", message: "x" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid-request",
    });
  });

  it("reports not-configured instead of pretending the model answered", async () => {
    process.env.LUMINA_LLM_URL = "";
    const response = await POST(request({ lane: "tanya", question: "halo" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not-configured",
    });
  });

  it("returns a validated job_search call, even with empty text", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "",
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "job_search",
                    arguments: JSON.stringify({
                      query: "React remote",
                      location: "Jakarta",
                      salaryMin: 8000000,
                    }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan React remote" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      text: "",
      toolCalls: [
        {
          id: "call-1",
          name: "job_search",
          arguments: {
            query: "React remote",
            location: "Jakarta",
            salaryMin: 8000000,
          },
        },
      ],
    });
  });

  it("drops a tool call whose arguments do not validate", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Baik.",
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "job_search",
                    arguments: JSON.stringify({ message: "Halo dari BCA" }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan" }),
    );
    const body = (await response.json()) as { toolCalls: unknown[] };
    expect(body.toolCalls).toEqual([]);
  });

  it("drops an unknown function name", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Baik.",
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: { name: "delete_everything", arguments: "{}" },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan" }),
    );
    const body = (await response.json()) as { toolCalls: unknown[] };
    expect(body.toolCalls).toEqual([]);
  });

  it("returns 503 when the model produced neither text nor a tool call", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "   " } }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan" }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "upstream-empty",
    });
  });

  it("drops a tool call whose arguments are malformed JSON", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Baik.",
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: { name: "job_search", arguments: "{not json" },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan" }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { toolCalls: unknown[] };
    expect(body.toolCalls).toEqual([]);
  });

  it("drops a tool call whose type is not function", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Baik.",
              tool_calls: [
                {
                  id: "call-1",
                  type: "retrieval",
                  function: {
                    name: "job_search",
                    arguments: JSON.stringify({ query: "React" }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan" }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { toolCalls: unknown[] };
    expect(body.toolCalls).toEqual([]);
  });

  it("offers report_draft and returns it with no message content", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Saya buka template laporannya.",
              tool_calls: [
                {
                  id: "call-2",
                  type: "function",
                  function: {
                    name: "report_draft",
                    arguments: JSON.stringify({ channel: "iasc" }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({
        lane: "lanjutan",
        question: "buatkan laporan ke OJK",
        hasVerdict: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      text: "Saya buka template laporannya.",
      toolCalls: [
        { id: "call-2", name: "report_draft", arguments: { channel: "iasc" } },
      ],
    });

    const sent = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { tools: { function: { name: string } }[] };
    expect(sent.tools.map((tool) => tool.function.name)).toEqual([
      "report_draft",
    ]);
  });

  it("rejects a model's unsolicited job search on a course request", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Buka materi Belajar.",
              tool_calls: [
                {
                  id: "unrelated",
                  type: "function",
                  function: {
                    name: "job_search",
                    arguments: JSON.stringify({ query: "React" }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await POST(
      request({
        lane: "tanya",
        question: "kasih solusi yg jelas dong, ada course yg berguna ga",
        history: [
          { role: "user", text: "akun aku di hack dan uang aku hilang" },
        ],
      }),
    );
    expect(await response.json()).toMatchObject({
      text: "Buka materi Belajar.",
      toolCalls: [],
    });
    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools?: unknown;
      messages: { content: string }[];
    };
    expect(sent.tools).toBeUndefined();
    expect(
      JSON.parse(sent.messages[1]?.content ?? "{}").history[0].text,
    ).toContain("akun aku di hack");
  });

  it("drops an unsolicited report tool on a plain question", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Laporan adalah catatan resmi.",
              tool_calls: [
                {
                  id: "call-9",
                  type: "function",
                  function: {
                    name: "report_draft",
                    arguments: JSON.stringify({}),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "tanya", question: "apa itu laporan penipuan?" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ toolCalls: [] });

    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools?: unknown;
    };
    expect(sent.tools).toBeUndefined();
  });

  it("does not offer report_draft for a how-to question", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Begini caranya.", tool_calls: [] } }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await POST(
      request({ lane: "tanya", question: "bagaimana cara buat laporan?" }),
    );
    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools?: unknown;
    };
    expect(sent.tools).toBeUndefined();
  });

  it("withholds tools on the final loop step", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Baik.",
              tool_calls: [
                {
                  id: "call-10",
                  type: "function",
                  function: {
                    name: "job_search",
                    arguments: JSON.stringify({ query: "React" }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({
        lane: "tanya",
        question: "cari lowongan React",
        final: true,
      }),
    );
    expect(await response.json()).toMatchObject({ toolCalls: [] });
    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools?: unknown;
    };
    expect(sent.tools).toBeUndefined();
  });

  it("rebuilds the transcript from a typed job observation", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Ada satu lowongan React yang bersih.",
              tool_calls: [],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({
        lane: "tanya",
        question: "cari lowongan React",
        observations: [
          {
            name: "job_search",
            callId: "call-1",
            arguments: { query: "React" },
            ok: true,
            result: {
              count: 1,
              total: 1,
              capped: false,
              postings: [
                {
                  title: "Frontend Engineer",
                  company: "Maju",
                  sentinelStatus: "clean",
                  luminaRisk: "bersih",
                },
              ],
            },
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: "Ada satu lowongan React yang bersih.",
      toolCalls: [],
    });

    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      tools: { function: { name: string } }[];
      messages: {
        role: string;
        tool_calls?: { id: string }[];
        tool_call_id?: string;
        content: string;
      }[];
    };
    expect(sent.tools.map((tool) => tool.function.name)).toEqual([
      "job_search",
    ]);
    expect(sent.messages[2]?.tool_calls?.[0]?.id).toBe("call-1");
    expect(sent.messages[3]?.role).toBe("tool");
    expect(sent.messages[3]?.tool_call_id).toBe("call-1");
    expect(sent.messages[3]?.content).toContain("Frontend Engineer");
  });

  it("rejects an observation for a tool the question did not request", async () => {
    const response = await POST(
      request({
        lane: "tanya",
        question: "apa itu pinjol?",
        observations: [
          {
            name: "job_search",
            callId: "call-1",
            arguments: { query: "React" },
            ok: true,
            result: { count: 0, total: 0, capped: false, postings: [] },
          },
        ],
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid-observation",
    });
  });

  it("carries attachment text only on an explicit content question", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "Teksnya meminta OTP.", tool_calls: [] } },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({
        lane: "tanya",
        question: "apa isi gambar ini?",
        contentQuestion: true,
        attachmentContext: [{ kind: "image", text: "Kirim OTP sekarang." }],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: "Teksnya meminta OTP.",
    });

    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: { content: string }[];
    };
    const payload = JSON.parse(sent.messages[1]?.content ?? "{}");
    expect(payload.attachmentContext).toEqual([
      { kind: "image", text: "Kirim OTP sekarang." },
    ]);
    expect(JSON.stringify(payload)).not.toContain("namafile");
  });

  it("rejects attachment text on a non-content request", async () => {
    const response = await POST(
      request({
        lane: "tanya",
        question: "apa itu pinjol?",
        attachmentContext: [{ kind: "text", text: "isi" }],
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid-attachment-context",
    });
  });
});
