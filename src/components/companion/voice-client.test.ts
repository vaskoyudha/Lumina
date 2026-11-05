/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { requestReply } from "@/components/companion/voice-client";
import type { VoiceDigest } from "@/lib/contracts/agent-run";

const digest: VoiceDigest = {
  risk: "tinggi",
  score: 82,
  modusName: "File APK via WhatsApp",
  findings: [{ label: "Meminta membuka file APK", weight: 0.85 }],
  advice: ["Jangan instal file APK itu."],
  moduleNo: 10,
  locale: "id",
};

afterEach(() => {
  jest.restoreAllMocks();
});

function errorResponse(code: string): Response {
  return new Response(JSON.stringify({ ok: false, error: code }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });
}

describe("requestReply", () => {
  it("reports failure without throwing when the route is absent", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    const chunks: string[] = [];
    const result = await requestReply(digest, (chunk) => chunks.push(chunk));
    expect(result.outcome).toBe("failed");
    expect(result.text).toBe("");
    expect(chunks).toEqual([]);
  });

  it("distinguishes a model that was never configured", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(errorResponse("not-configured"));
    expect((await requestReply(digest, () => {})).outcome).toBe("unconfigured");
  });

  it("distinguishes a slow model from an unconfigured one", async () => {
    // The defect this test exists for: a 6s abort used to be reported as
    // "not configured", which made a working setup look hardcoded.
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(errorResponse("upstream-timeout"));
    expect((await requestReply(digest, () => {})).outcome).toBe("timeout");
  });

  it("reports a generic failure for an upstream error", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(errorResponse("upstream-failed"));
    expect((await requestReply(digest, () => {})).outcome).toBe("failed");
  });

  it("delivers chunks in order and returns the whole text", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("Jangan "));
        controller.enqueue(new TextEncoder().encode("transfer."));
        controller.close();
      },
    });
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(stream, { status: 200 }));

    const chunks: string[] = [];
    const result = await requestReply(digest, (chunk) => chunks.push(chunk));
    expect(result.outcome).toBe("model");
    expect(result.text).toBe("Jangan transfer.");
    expect(chunks.join("")).toBe("Jangan transfer.");
  });

  it("rejects a reply that stops mid-word", async () => {
    // Measured in the browser: the upstream stream closes early and the route
    // faithfully forwards a half-sentence. Rendering that as the answer looks
    // broken and teaches nothing, so it must fall back.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "Pemeriksaan kali ini tidak menemukan indikasi mencurig",
          ),
        );
        controller.close();
      },
    });
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(stream, { status: 200 }));

    const result = await requestReply(digest, () => {});
    expect(result.outcome).toBe("truncated");
    // The partial text is returned now: the caller keeps what the reader has
    // already seen instead of replacing it with a template.
    expect(result.text).toBe(
      "Pemeriksaan kali ini tidak menemukan indikasi mencurig",
    );
  });

  it("accepts a reply that ends with a closing quote", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('Jangan buka tautan "bca-verif.xyz."'),
        );
        controller.close();
      },
    });
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(stream, { status: 200 }));

    expect((await requestReply(digest, () => {})).outcome).toBe("model");
  });

  it("treats an empty stream as a failure rather than a blank answer", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(stream, { status: 200 }));
    expect((await requestReply(digest, () => {})).outcome).toBe("failed");
  });

  it("sends a POST whose body is exactly the digest", async () => {
    const spy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(errorResponse("not-configured"));

    await requestReply(digest, () => {});

    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toBe("/api/companion/voice");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(digest));
  });
});
