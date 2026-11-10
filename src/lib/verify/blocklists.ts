import { createHash } from "node:crypto";
import type { ReputationVerdict } from "@/lib/contracts/verify";
import { providerJson } from "@/lib/verify/http";

const CACHE_MS = 6 * 60 * 60 * 1000;
const verdictCache = new Map<
  string,
  { at: number; value: ReputationVerdict[] }
>();
let openPhish: { at: number; urls: Set<string> } | null = null;
const cacheKey = (url: string) =>
  createHash("sha256").update(url).digest("hex");
export function cachedBlocklists(url: string): ReputationVerdict[] | null {
  const entry = verdictCache.get(cacheKey(url));
  return entry && Date.now() - entry.at < CACHE_MS ? entry.value : null;
}
export function clearBlocklistCache() {
  verdictCache.clear();
  openPhish = null;
}
export async function lookupBlocklists(
  url: string,
  signal: AbortSignal,
): Promise<ReputationVerdict[]> {
  const cached = cachedBlocklists(url);
  if (cached) return cached;
  const unavailable = (source: string): ReputationVerdict => ({
    source,
    listed: null,
    status: "tidak tersedia",
  });
  const run = async (
    source: string,
    work: () => Promise<boolean>,
  ): Promise<ReputationVerdict> => {
    try {
      return { source, listed: await work(), status: "ok" };
    } catch {
      return unavailable(source);
    }
  };
  const results = await Promise.all([
    process.env.OPENPHISH_FEED_URL
      ? run("OpenPhish", async () => {
          if (!openPhish || Date.now() - openPhish.at > 900000) {
            const feed = await fetch(process.env.OPENPHISH_FEED_URL as string, {
              signal,
              redirect: "error",
              cache: "no-store",
            });
            if (!feed.ok) throw new Error("source");
            const text = await feed.text();
            if (text.length > 5_000_000) throw new Error("feed-size");
            openPhish = {
              at: Date.now(),
              urls: new Set(text.split(/\r?\n/).filter(Boolean)),
            };
          }
          return openPhish.urls.has(url);
        })
      : Promise.resolve(unavailable("OpenPhish")),
    process.env.URLHAUS_AUTH_KEY
      ? run("URLhaus", async () => {
          const data = (await providerJson(
            "https://urlhaus-api.abuse.ch/v1/url/",
            {
              method: "POST",
              headers: {
                "Auth-Key": process.env.URLHAUS_AUTH_KEY as string,
                "content-type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ url }),
            },
            signal,
          )) as { query_status?: string; url_status?: string };
          if (data.query_status === "no_results") return false;
          if (data.query_status !== "ok") throw new Error("source");
          return true;
        })
      : Promise.resolve(unavailable("URLhaus")),
    process.env.GOOGLE_SAFE_BROWSING_KEY
      ? run("Google Safe Browsing", async () => {
          const data = (await providerJson(
            `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(process.env.GOOGLE_SAFE_BROWSING_KEY as string)}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                client: { clientId: "lumina", clientVersion: "1" },
                threatInfo: {
                  threatTypes: [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                  ],
                  platformTypes: ["ANY_PLATFORM"],
                  threatEntryTypes: ["URL"],
                  threatEntries: [{ url }],
                },
              }),
            },
            signal,
          )) as { matches?: unknown[] };
          return (data.matches?.length ?? 0) > 0;
        })
      : Promise.resolve(unavailable("Google Safe Browsing")),
  ]);
  if (results.some((r) => r.status === "ok")) {
    if (verdictCache.size >= 1000)
      verdictCache.delete(verdictCache.keys().next().value as string);
    verdictCache.set(cacheKey(url), { at: Date.now(), value: results });
  }
  return results;
}
