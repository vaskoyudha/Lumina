import { fetchChat } from "@/lib/server/llm";

const originalFetch = global.fetch;
const originalPrimary = process.env.LUMINA_LLM_REASONING_EFFORT;
const originalFallback = process.env.LUMINA_LLM_FALLBACK_REASONING_EFFORT;

function reply(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: null,
    json: async () => ({ status }),
  } as unknown as Response;
}

afterEach(() => {
  global.fetch = originalFetch;
  if (originalPrimary === undefined)
    delete process.env.LUMINA_LLM_REASONING_EFFORT;
  else process.env.LUMINA_LLM_REASONING_EFFORT = originalPrimary;
  if (originalFallback === undefined)
    delete process.env.LUMINA_LLM_FALLBACK_REASONING_EFFORT;
  else process.env.LUMINA_LLM_FALLBACK_REASONING_EFFORT = originalFallback;
});

it("falls back to the second model only after a quota response", async () => {
  process.env.LUMINA_LLM_REASONING_EFFORT = "none";
  delete process.env.LUMINA_LLM_FALLBACK_REASONING_EFFORT;
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce(reply(429))
    .mockResolvedValueOnce(reply(200));
  global.fetch = fetchMock as unknown as typeof fetch;

  const response = await fetchChat({
    base: "http://model.test/v1/",
    apiKey: "secret",
    model: "primary",
    fallbackModel: "fallback",
    signal: new AbortController().signal,
    body: { messages: [] },
  });

  expect(response.status).toBe(200);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const first = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
  const second = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
  expect(first).toMatchObject({ model: "primary", reasoning_effort: "none" });
  expect(second).toMatchObject({ model: "fallback" });
  expect(second).not.toHaveProperty("reasoning_effort");
  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    "http://model.test/v1/chat/completions",
  );
});

it("does not send a malformed request to the fallback model", async () => {
  const fetchMock = jest.fn().mockResolvedValueOnce(reply(400));
  global.fetch = fetchMock as unknown as typeof fetch;

  const response = await fetchChat({
    base: "http://model.test/v1",
    model: "primary",
    fallbackModel: "fallback",
    signal: new AbortController().signal,
    body: { messages: [] },
  });

  expect(response.status).toBe(400);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("keeps a single attempt when no fallback is configured", async () => {
  const fetchMock = jest.fn().mockResolvedValueOnce(reply(503));
  global.fetch = fetchMock as unknown as typeof fetch;

  const response = await fetchChat({
    base: "http://model.test/v1",
    model: "primary",
    signal: new AbortController().signal,
    body: { messages: [] },
  });

  expect(response.status).toBe(503);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
