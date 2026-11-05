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
});
