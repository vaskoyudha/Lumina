/**
 * @jest-environment node
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { POST } from "@/app/api/companion/voice/route";
import type { VoiceDigest } from "@/lib/contracts/agent-run";

const digest: VoiceDigest = {
  risk: "tinggi",
  score: 82,
  modusName: "File APK via WhatsApp",
  findings: [{ label: "Pesan meminta kamu membuka file APK", weight: 0.85 }],
  advice: ["Jangan instal file APK itu."],
  moduleNo: 10,
  locale: "id",
};

const MANAGED = [
  "LUMINA_LLM_URL",
  "LUMINA_LLM_MODEL",
  "LUMINA_LLM_KEY",
] as const;
const original = new Map(MANAGED.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.LUMINA_LLM_URL = "http://127.0.0.1:9/v1";
  process.env.LUMINA_LLM_MODEL = "test-model";
  delete process.env.LUMINA_LLM_KEY;
});

afterEach(() => {
  for (const key of MANAGED) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.restoreAllMocks();
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/voice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/companion/voice", () => {
  it("returns 400 for a payload carrying the raw message", async () => {
    const response = await POST(request({ ...digest, text: "isi pesan" }));
    expect(response.status).toBe(400);
  });

  it("returns 503 when no endpoint is configured", async () => {
    delete process.env.LUMINA_LLM_URL;
    delete process.env.LUMINA_LLM_MODEL;
    const response = await POST(request(digest));
    expect(response.status).toBe(503);
  });

  it("streams prose when the endpoint answers", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          'data: {"choices":[{"delta":{"content":"Jangan instal APK itu."}}]}\n\n' +
            "data: [DONE]\n\n",
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      );

    const response = await POST(request(digest));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Jangan instal APK itu.");
  });

  it("returns 503 when the endpoint fails", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("nope", { status: 500 }));
    const response = await POST(request(digest));
    expect(response.status).toBe(503);
  });

  it("returns 503 when the endpoint is unreachable", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const response = await POST(request(digest));
    expect(response.status).toBe(503);
  });

  it("sends the digest and never the message", async () => {
    const spy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await POST(request(digest));

    const body = JSON.parse(String(spy.mock.calls[0]?.[1]?.body)) as {
      messages: { role: string; content: string }[];
    };
    const userMessage = body.messages.find((m) => m.role === "user");

    // Byte-identical to the digest: nothing appended, nothing smuggled in.
    expect(userMessage?.content).toBe(JSON.stringify(digest));
    expect(userMessage?.content).not.toContain("evidence");
  });
});
