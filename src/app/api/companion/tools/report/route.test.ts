/** @jest-environment node */
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn().mockResolvedValue(undefined),
  AuthError: class AuthError extends Error {},
}));

import { POST } from "@/app/api/companion/tools/report/route";
import { consumeAttempt } from "@/lib/auth/accounts";

const valid = {
  channelId: "iasc",
  draft: { subject: "Laporan", body: "Nama: [NAMA ANDA]" },
  facts: { modus: "fake-call", tactics: ["otoritas"] },
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/tools/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
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

describe("POST /api/companion/tools/report", () => {
  it("rejects a body carrying the checked message", async () => {
    const response = await POST(request({ ...valid, message: "kutipan" }));
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 503 not-configured when the model is unset", async () => {
    process.env.LUMINA_LLM_URL = "";
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not-configured",
    });
  });

  it("forwards the draft and returns the polished text", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Nama pelapor: [NAMA ANDA]" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      text: "Nama pelapor: [NAMA ANDA]",
    });

    const sent = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { messages: { role: string; content: string }[] };
    expect(sent.messages[1]?.content).toContain("[NAMA ANDA]");
  });
});
