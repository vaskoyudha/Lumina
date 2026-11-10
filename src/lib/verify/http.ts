/** Bounded responses from fixed, administrator-configured public providers. */
export async function providerJson(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  allowNotFound = false,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal,
    redirect: "error",
    cache: "no-store",
  });
  if (response.status === 404 && allowNotFound) return null;
  if (!response.ok) throw new Error("source-unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("source-empty");
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 65536) {
        await reader.cancel();
        throw new Error("source-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(data));
}
