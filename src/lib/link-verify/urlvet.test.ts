/** @jest-environment node */
import {
  LinkVerifyError,
  urlvetBaseUrl,
  verifyLink,
} from "@/lib/link-verify/urlvet";

const realEnv = process.env;
const realFetch = global.fetch;

const report = {
  result: {
    verdict: "Risky",
    final_score: 12,
    reasons: {
      bad_reasons: ["Risky TLD", "Login form posts off-domain"],
      good_reasons: null,
    },
  },
  incomplete: false,
  domain: "evil.top",
};

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env = { ...realEnv };
  process.env.URLVET_API_URL = "http://scanner.local:8080";
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = realFetch;
  process.env = realEnv;
});

describe("verifyLink", () => {
  it("encodes the URL and maps the report", async () => {
    jest.mocked(global.fetch).mockResolvedValue(ok(report));

    const verdict = await verifyLink("https://evil.top/a?b=1");

    expect(verdict).toEqual({
      verdict: "Risky",
      score: 12,
      badReasons: ["Risky TLD", "Login form posts off-domain"],
      goodReasons: [],
      incomplete: false,
      domain: "evil.top",
    });
    expect(jest.mocked(global.fetch).mock.calls[0]?.[0]).toBe(
      "http://scanner.local:8080/api/v1/analyze?url=https%3A%2F%2Fevil.top%2Fa%3Fb%3D1",
    );
  });

  it("accepts a null reasons block and a missing domain", async () => {
    jest
      .mocked(global.fetch)
      .mockResolvedValue(ok({ result: { verdict: "Safe", final_score: 98 } }));

    await expect(verifyLink("https://example.com")).resolves.toEqual({
      verdict: "Safe",
      score: 98,
      badReasons: [],
      goodReasons: [],
      incomplete: false,
      domain: null,
    });
  });

  it("is disabled when URLVET_API_URL is off", async () => {
    process.env.URLVET_API_URL = "off";
    expect(urlvetBaseUrl()).toBeNull();
    await expect(verifyLink("https://example.com")).rejects.toMatchObject({
      code: "disabled",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("falls back to the public instance when unset", () => {
    process.env.URLVET_API_URL = "";
    expect(urlvetBaseUrl()).toBe("https://api.url.vet");
  });

  it("rejects a report it does not recognise", async () => {
    jest.mocked(global.fetch).mockResolvedValue(ok({ hello: "world" }));
    await expect(verifyLink("https://example.com")).rejects.toBeInstanceOf(
      LinkVerifyError,
    );
    await expect(verifyLink("https://example.com")).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("maps a non-2xx answer to upstream", async () => {
    jest
      .mocked(global.fetch)
      .mockResolvedValue(new Response("nope", { status: 500 }));
    await expect(verifyLink("https://example.com")).rejects.toMatchObject({
      code: "upstream",
    });
  });

  it("maps an abort to timeout", async () => {
    const aborted = new Error("aborted");
    aborted.name = "AbortError";
    jest.mocked(global.fetch).mockRejectedValue(aborted);
    await expect(verifyLink("https://example.com")).rejects.toMatchObject({
      code: "timeout",
    });
  });
});
