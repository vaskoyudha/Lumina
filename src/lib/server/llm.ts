/**
 * One chat-completions boundary with an optional fallback model.
 *
 * The free models behind `LUMINA_LLM_URL` can return 429 while a different
 * model on the same endpoint is still available. Falling back only on quota
 * and upstream failures keeps a malformed request from being retried against a
 * second model, and keeps the primary model as the normal path.
 */

export interface ChatFetchInput {
  base: string;
  apiKey?: string;
  model: string;
  fallbackModel?: string;
  /** Everything except `model` and `reasoning_effort`. */
  body: Record<string, unknown>;
  signal: AbortSignal;
}

function attempts(
  model: string,
  fallbackModel?: string,
): { model: string; effort?: string }[] {
  const primary = {
    model,
    effort: process.env.LUMINA_LLM_REASONING_EFFORT?.trim() || "none",
  };
  const fallback = fallbackModel?.trim();
  if (!fallback || fallback === model) return [primary];
  return [
    primary,
    {
      model: fallback,
      effort: process.env.LUMINA_LLM_FALLBACK_REASONING_EFFORT?.trim(),
    },
  ];
}

function retryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchChat({
  base,
  apiKey,
  model,
  fallbackModel,
  body,
  signal,
}: ChatFetchInput): Promise<Response> {
  const chain = attempts(model, fallbackModel);
  let last: Response | null = null;

  for (const [index, attempt] of chain.entries()) {
    const payload = {
      ...body,
      model: attempt.model,
      ...(attempt.effort ? { reasoning_effort: attempt.effort } : {}),
    };
    const response = await fetch(
      `${base.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      },
    );

    if (response.ok || index === chain.length - 1) return response;
    if (!retryable(response.status)) return response;
    last = response;
    await response.body?.cancel();
  }

  return last as Response;
}
