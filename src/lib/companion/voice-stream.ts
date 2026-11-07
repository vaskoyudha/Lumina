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
function parseEvents(raw: string): string {
  let out = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload.length === 0 || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
      };
      out += parsed.choices?.[0]?.delta?.content ?? "";
    } catch {
      // A malformed event is skipped, not fatal: the reply still reads.
    }
  }
  return out;
}

export function streamChatText(
  upstream: ReadableStream<Uint8Array>,
  cleanup: () => void = () => {},
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read();

          if (done) {
            buffer += decoder.decode();
            const tail = parseEvents(buffer);
            buffer = "";
            if (tail.length > 0) controller.enqueue(encoder.encode(tail));
            cleanup();
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          // Events are separated by a blank line. Keep the trailing partial.
          const boundary = buffer.lastIndexOf("\n\n");
          if (boundary === -1) continue;

          const events = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const out = parseEvents(events);
          if (out.length > 0) {
            controller.enqueue(encoder.encode(out));
            return;
          }
        }
      } catch (error) {
        cleanup();
        void reader.cancel(error).catch(() => {});
        controller.error(error);
      }
    },
    cancel(reason) {
      cleanup();
      void reader.cancel(reason);
    },
  });
}
