/**
 * Turn an OpenAI-compatible SSE stream into a plain-text stream.
 *
 * Kept out of the route so it can be tested without Next, and so the route stays
 * a thin validation layer. Two things this must survive, because both were
 * produced by a real endpoint while this was written:
 *
 * a. a JSON object split across two network chunks;
 * b. keep-alive comment lines (`: ping`) that carry no data.
 *
 * And one that a naive implementation drops: the final event often arrives
 * without a trailing blank line, so a buffer that only ever flushes on "\n\n"
 * silently loses the last sentence of the reply.
 */

/** Pull the assistant text out of one or more already-complete SSE events. */
function parseEvents(raw: string): { text: string; done: boolean } {
  let out = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") return { text: out, done: true };
    if (payload.length === 0) continue;
    try {
      const parsed = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
      };
      const text = parsed.choices?.[0]?.delta?.content;
      if (typeof text === "string") out += text;
    } catch {
      // A malformed event is skipped, not fatal: the reply still reads.
    }
  }
  return { text: out, done: false };
}

export function streamChatText(
  upstream: ReadableStream<Uint8Array>,
  cleanup: () => void = () => {},
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  let buffer = "";
  let finished = false;
  const finish = (cancel = false, reason?: unknown) => {
    if (finished) return;
    finished = true;
    cleanup();
    if (cancel) void reader.cancel(reason).catch(() => {});
  };

  return new ReadableStream({
    async pull(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (finished) return;

          if (done) {
            buffer += decoder.decode();
            const tail = parseEvents(buffer);
            buffer = "";
            if (tail.text.length > 0)
              controller.enqueue(encoder.encode(tail.text));
            finish();
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          // Events are separated by a blank line. Keep the trailing partial.
          let out = "";
          for (;;) {
            const boundary = /\r?\n\r?\n/.exec(buffer);
            if (!boundary) break;
            const event = parseEvents(buffer.slice(0, boundary.index));
            buffer = buffer.slice(boundary.index + boundary[0].length);
            out += event.text;
            if (event.done) {
              if (out.length > 0) controller.enqueue(encoder.encode(out));
              finish(true);
              controller.close();
              return;
            }
          }
          if (out.length > 0) {
            controller.enqueue(encoder.encode(out));
            return;
          }
        }
      } catch (error) {
        if (finished) return;
        finish(true, error);
        controller.error(error);
      }
    },
    cancel(reason) {
      finish(true, reason);
    },
  });
}
