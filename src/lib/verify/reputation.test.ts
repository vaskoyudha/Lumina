import { beforeEach, describe, expect, it } from "@jest/globals";
import { clearBlocklistCache, lookupBlocklists } from "@/lib/verify/blocklists";
import { cachedReputation } from "@/lib/verify/reputation";

beforeEach(() => {
  clearBlocklistCache();
  jest.restoreAllMocks();
  delete process.env.OPENPHISH_FEED_URL;
});

describe("cachedReputation", () => {
  it("says there is no stored verdict instead of calling the link safe", () => {
    const result = cachedReputation("https://a-verif.xyz/");
    expect(result.sources).toEqual([]);
    expect(result.note).toBe("Belum ada reputasi tersimpan");
  });

  it("returns the cached sources once a lookup has run", async () => {
    process.env.OPENPHISH_FEED_URL = "https://feed.example/openphish.txt";
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "https://a-verif.xyz/",
    })) as unknown as typeof fetch;
    await lookupBlocklists(
      "https://a-verif.xyz/",
      new AbortController().signal,
    );
    const result = cachedReputation("https://a-verif.xyz/");
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.note).toMatch(/bukan bukti aman/i);
  });
});
