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

  it("returns the model's text and sends only the question", async () => {
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
          { role: "user", text: "Halo, ini dari BCA. Akun Anda diblokir." },
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
    // The tool must actually be offered to the model, not just declared.
    expect(sent).toContain('"job_search"');
    expect(sent).toContain('"tool_choice":"auto"');
    // The digest route's rule, restated for this route: nothing but what the
    // user typed.
    expect(sent).not.toContain("diblokir");
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
});
