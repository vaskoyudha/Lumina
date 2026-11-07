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
import { POST } from "@/app/api/companion/vision/route";

const MANAGED = [
  "LUMINA_LLM_URL",
  "LUMINA_LLM_MODEL",
  "LUMINA_LLM_KEY",
] as const;
const original = new Map(MANAGED.map((key) => [key, process.env[key]]));

const IMAGE = {
  mediaType: "image/png",
  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
};

beforeEach(() => {
  process.env.LUMINA_LLM_URL = "http://127.0.0.1:9/v1";
  process.env.LUMINA_LLM_MODEL = "test-vision-model";
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
  return new Request("http://localhost/api/companion/vision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/companion/vision", () => {
  it("rejects a payload with an extra field", async () => {
    const response = await POST(request({ image: IMAGE, score: 90 }));
    expect(response.status).toBe(400);
  });

  it("rejects a nested field that could carry a verdict", async () => {
    const response = await POST(
      request({ image: { ...IMAGE, risk: "tinggi" } }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 503 when no endpoint is configured", async () => {
    delete process.env.LUMINA_LLM_URL;
    delete process.env.LUMINA_LLM_MODEL;
    const response = await POST(request({ image: IMAGE }));
    expect(response.status).toBe(503);
  });

  it("sends the image as a data URL and returns only the transcription", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "Undangan pernikahan.apk\nTransfer Rp250.000 ke 081234567890",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const response = await POST(request({ image: IMAGE }));
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { ok: boolean; text: string };
    expect(payload.ok).toBe(true);
    expect(payload.text).toContain("Undangan pernikahan.apk");
    expect(payload).not.toHaveProperty("score");
    expect(payload).not.toHaveProperty("risk");

    const init = fetchMock.mock.calls[0]?.[1];
    const body = String(init?.body);
    expect(body).toContain(`data:${IMAGE.mediaType};base64,${IMAGE.data}`);
  });

  it("returns 503 when the upstream rejects the image", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("no", { status: 500 }));

    const response = await POST(request({ image: IMAGE }));
    expect(response.status).toBe(503);
  });

  it("returns 502 when the model returns no text", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "   " } }] }),
          { status: 200 },
        ),
      );

    const response = await POST(request({ image: IMAGE }));
    expect(response.status).toBe(502);
  });
});
