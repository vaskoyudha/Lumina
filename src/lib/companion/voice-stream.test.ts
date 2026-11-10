/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { streamChatText } from "@/lib/companion/voice-stream";

const encoder = new TextEncoder();

function chunked(...parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("streamChatText", () => {
  it("flattens chat-completion SSE into plain text", async () => {
    const upstream = chunked(
      'data: {"choices":[{"delta":{"content":"Jangan "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"transfer."}}]}\n\n',
      "data: [DONE]\n\n",
    );
    expect(await drain(streamChatText(upstream))).toBe("Jangan transfer.");
  });

  it("survives a chunk split mid-JSON", async () => {
    const upstream = chunked(
      'data: {"choices":[{"delta":{"cont',
      'ent":"Aman."}}]}\n\n',
      "data: [DONE]\n\n",
    );
    expect(await drain(streamChatText(upstream))).toBe("Aman.");
  });

  it("ignores keep-alive comments and empty deltas", async () => {
    const upstream = chunked(
      ": ping\n\n",
      'data: {"choices":[{"delta":{}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Halo"}}]}\n\n',
    );
    expect(await drain(streamChatText(upstream))).toBe("Halo");
  });

  it("flushes a final event that has no trailing blank line", async () => {
    const upstream = chunked(
      'data: {"choices":[{"delta":{"content":"Selesai"}}]}',
    );
    expect(await drain(streamChatText(upstream))).toBe("Selesai");
  });
  it("streams CRLF events before the upstream connection closes", async () => {
    const state: { controller?: ReadableStreamDefaultController<Uint8Array> } =
      {};
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        state.controller = controller;
      },
    });
    const reader = streamChatText(upstream).getReader();
    const upstreamController = state.controller;
    if (!upstreamController) throw new Error("Missing stream controller");
    upstreamController.enqueue(
      encoder.encode('data: {"choices":[{"delta":{"content":"Halo."}}]}\r\n\r'),
    );
    upstreamController.enqueue(encoder.encode("\n"));
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("Halo.");
    await reader.cancel();
  });
  it("closes at DONE and cancels an upstream that stays connected", async () => {
    const cleanup = jest.fn(),
      cancel = jest.fn();
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Selesai."}}]}\n\ndata: [DONE]\n\n',
          ),
        );
      },
      cancel,
    });
    expect(await drain(streamChatText(upstream, cleanup))).toBe("Selesai.");
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
