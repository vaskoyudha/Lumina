/** @jest-environment node */
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn().mockResolvedValue(undefined),
  AuthError: class AuthError extends Error {},
}));

import { POST } from "@/app/api/link/verify/route";
import { AuthError, consumeAttempt } from "@/lib/auth/accounts";

const realEnv = process.env;
const realFetch = global.fetch;

function request(body: unknown): Request {
  return new Request("http://localhost/api/link/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function report(): Response {
  return new Response(
    JSON.stringify({
      result: {
        verdict: "Suspicious",
        final_score: 37,
        reasons: { bad_reasons: ["Risky TLD"] },
      },
      incomplete: true,
      domain: "xxeee.top",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...realEnv, URLVET_API_URL: "http://scanner.local:8080" };
  jest.mocked(consumeAttempt).mockResolvedValue(undefined);
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = realFetch;
  process.env = realEnv;
});

describe("POST /api/link/verify", () => {
  it("sends only the URL and returns the verdict", async () => {
    const fetchMock = jest.fn().mockResolvedValue(report());
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ url: "https://xxeee.top/jp", message: "OTP" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      verdict: {
        verdict: "Suspicious",
        score: 37,
        badReasons: ["Risky TLD"],
        goodReasons: [],
        incomplete: true,
        domain: "xxeee.top",
      },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://scanner.local:8080/api/v1/analyze?url=https%3A%2F%2Fxxeee.top%2Fjp",
    );
  });

  it("rejects a missing or non-http URL without calling the scanner", async () => {
    expect((await POST(request({}))).status).toBe(400);
    expect((await POST(request({ url: "ftp://example.com" }))).status).toBe(
      400,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 503 when the scanner fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response("boom", { status: 500 }),
      ) as unknown as typeof fetch;

    const response = await POST(request({ url: "https://example.com" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "upstream-failed",
    });
  });

  it("returns 429 when the per-client budget is spent", async () => {
    jest.mocked(consumeAttempt).mockRejectedValueOnce(new AuthError());
    const response = await POST(request({ url: "https://example.com" }));
    expect(response.status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 503 not-configured when the scanner is off", async () => {
    process.env.URLVET_API_URL = "off";
    const response = await POST(request({ url: "https://example.com" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not-configured",
    });
  });
});
