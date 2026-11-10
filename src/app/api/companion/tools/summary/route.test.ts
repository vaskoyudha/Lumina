/** @jest-environment node */
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn().mockResolvedValue(undefined),
  AuthError: class AuthError extends Error {},
}));

import { POST } from "@/app/api/companion/tools/summary/route";
import { consumeAttempt } from "@/lib/auth/accounts";

const posting = {
  title: "Frontend Engineer",
  company: "PT Maju",
  sentinelStatus: "clean",
  luminaRisk: "bersih",
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/tools/summary", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function upstream(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const env = process.env;
const realFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...env,
    LUMINA_LLM_URL: "http://model.local/v1",
    LUMINA_LLM_MODEL: "test-model",
  };
  jest.mocked(consumeAttempt).mockResolvedValue(undefined);
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = realFetch;
  process.env = env;
});

describe("POST /api/companion/tools/summary", () => {
  it("rejects a body carrying a description", async () => {
    const response = await POST(
      request({
        count: 1,
        postings: [{ ...posting, description: "kutipan" }],
      }),
    );
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("forwards titles, companies, verdicts, and a count only", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(upstream("Ada satu lowongan."));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(request({ count: 1, postings: [posting] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      text: "Ada satu lowongan.",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { messages: { role: string; content: string }[] };
    const sent = body.messages[1]?.content ?? "";
    expect(sent).toContain("Frontend Engineer");
    expect(sent).toContain('"rekomendasi"');
    expect(sent).toContain('"aman":1');
    expect(sent).not.toContain("description");
    expect(sent).not.toContain("query");
  });

  it("tells the model the recommendation it must not re-score", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(upstream("Satu lowongan perlu diperiksa."));
    global.fetch = fetchMock as unknown as typeof fetch;

    await POST(
      request({
        count: 1,
        postings: [{ ...posting, sentinelStatus: "suspicious" }],
      }),
    );

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { messages: { role: string; content: string }[] };
    const system = body.messages[0]?.content ?? "";
    const sent = body.messages[1]?.content ?? "";
    expect(system).toMatch(/jangan menilai ulang/i);
    expect(sent).toContain('"waspada":1');
  });

  it("returns 503 not-configured when the model is unset", async () => {
    process.env.LUMINA_LLM_URL = "";
    const response = await POST(request({ count: 0, postings: [] }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not-configured",
    });
  });

  it("returns 503 when the model answers nothing", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(upstream("  ")) as unknown as typeof fetch;
    const response = await POST(request({ count: 1, postings: [posting] }));
    expect(response.status).toBe(503);
  });
});
