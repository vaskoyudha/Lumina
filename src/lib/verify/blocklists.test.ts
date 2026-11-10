import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import {
  cachedBlocklists,
  clearBlocklistCache,
  lookupBlocklists,
} from "@/lib/verify/blocklists";

const controller = () => new AbortController().signal;
const saved = { ...process.env };

beforeEach(() => {
  process.env = { ...saved };
  delete process.env.OPENPHISH_FEED_URL;
  delete process.env.URLHAUS_AUTH_KEY;
  delete process.env.GOOGLE_SAFE_BROWSING_KEY;
  clearBlocklistCache();
  jest.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...saved };
  clearBlocklistCache();
});

describe("lookupBlocklists", () => {
  it("says every source is unavailable when nothing is configured", async () => {
    const sources = await lookupBlocklists(
      "https://a-verif.xyz/",
      controller(),
    );
    expect(sources.map((s) => s.source)).toEqual([
      "OpenPhish",
      "URLhaus",
      "Google Safe Browsing",
    ]);
    for (const source of sources) {
      expect(source.status).toBe("tidak tersedia");
      expect(source.listed).toBeNull();
    }
  });

  it("marks a URL that the OpenPhish feed lists", async () => {
    process.env.OPENPHISH_FEED_URL = "https://feed.example/openphish.txt";
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "https://a-verif.xyz/\nhttps://other.example/",
    })) as unknown as typeof fetch;
    const sources = await lookupBlocklists(
      "https://a-verif.xyz/",
      controller(),
    );
    expect(sources.find((s) => s.source === "OpenPhish")).toEqual({
      source: "OpenPhish",
      listed: true,
      status: "ok",
    });
  });

  it("does not list a URL the feed does not contain", async () => {
    process.env.OPENPHISH_FEED_URL = "https://feed.example/openphish.txt";
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "https://other.example/",
    })) as unknown as typeof fetch;
    const sources = await lookupBlocklists(
      "https://a-verif.xyz/",
      controller(),
    );
    expect(sources.find((s) => s.source === "OpenPhish")?.listed).toBe(false);
  });

  it("reports a failing source as unavailable instead of safe", async () => {
    process.env.OPENPHISH_FEED_URL = "https://feed.example/openphish.txt";
    global.fetch = jest.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const sources = await lookupBlocklists(
      "https://a-verif.xyz/",
      controller(),
    );
    expect(sources.find((s) => s.source === "OpenPhish")).toEqual({
      source: "OpenPhish",
      listed: null,
      status: "tidak tersedia",
    });
  });

  it("caches the verdict and does not refetch on the next check", async () => {
    process.env.OPENPHISH_FEED_URL = "https://feed.example/openphish.txt";
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "https://a-verif.xyz/",
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await lookupBlocklists("https://a-verif.xyz/", controller());
    await lookupBlocklists("https://a-verif.xyz/", controller());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cachedBlocklists("https://a-verif.xyz/")).toHaveLength(3);
  });

  it("clears the cache on request", async () => {
    process.env.OPENPHISH_FEED_URL = "https://feed.example/openphish.txt";
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "https://a-verif.xyz/",
    })) as unknown as typeof fetch;
    await lookupBlocklists("https://a-verif.xyz/", controller());
    clearBlocklistCache();
    expect(cachedBlocklists("https://a-verif.xyz/")).toBeNull();
  });
});
