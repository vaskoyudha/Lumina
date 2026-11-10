import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { auditPosting } from "@/lib/loker/audit/sentinel";
import { adapterUntuk, namaPapan } from "@/lib/loker/boards";
import { hostDari } from "@/lib/loker/boards/url";
import { scanDataDir } from "@/lib/loker/bootstrap";
import {
  type DomainAge,
  extractEmail,
  lookupDomainAge,
  registrableDomain,
} from "@/lib/loker/enrich";
import { type IngestDeps, ingestScan } from "@/lib/loker/ingest";
import { ioDefault } from "@/lib/loker/io";
import { normalisasiKunciUrl, parseInbox } from "@/lib/loker/receipt";
import { runScan } from "@/lib/loker/scan";
import {
  finishScanRun,
  lastSuccessfulScanFinishedAt,
  readDomainCache,
  readPostingKeys,
  type ScanRunResult,
  upsertPosting,
  writeDomainCache,
} from "@/lib/loker/store";
import { scoreText } from "@/lib/scoring/score";

const CACHE_TTL_MS = 30 * 86_400_000;

/** A failed RDAP lookup is retried after an hour, not on every scan. */
const ERROR_TTL_MS = 60 * 60_000;

/** Rows a single refresh may backfill, so a 764-row pipeline stays bounded. */
const BACKFILL_LIMIT = 200;

/** Concurrent rows for one domain share a single RDAP request. */
const inFlightDomainAge = new Map<string, Promise<DomainAge>>();

/**
 * Domain age, cached in Postgres.
 *
 * RDAP is the only network call enrichment makes besides the board detail
 * fetch. The cache is keyed by registrable domain, so 12 Jobstreet postings on
 * one host cost one lookup. Concurrent rows for the same domain share the
 * in-flight promise, and an `error` entry is honoured for `ERROR_TTL_MS`
 * instead of being re-queried by every row and every scan.
 */
async function cachedDomainAge(url: string): Promise<DomainAge> {
  const domain = registrableDomain(hostDari(url));
  if (!domain) return { status: "unknown", ageDays: null };

  const cached = await readDomainCache(domain);
  if (cached) {
    const ttl = cached.status === "error" ? ERROR_TTL_MS : CACHE_TTL_MS;
    const fresh = Date.now() - Date.parse(cached.checkedAt) < ttl;
    if (fresh) return { status: cached.status, ageDays: cached.ageDays };
  }

  const pending = inFlightDomainAge.get(domain);
  if (pending) return pending;

  const next = (async (): Promise<DomainAge> => {
    try {
      const result = await lookupDomainAge(domain, ioDefault);
      await writeDomainCache(domain, result.ageDays, result.status);
      return result;
    } finally {
      inFlightDomainAge.delete(domain);
    }
  })();
  inFlightDomainAge.set(domain, next);
  return next;
}

/** The production dependency set. Tests build their own. */
export function realIngestDeps(): IngestDeps {
  return {
    async detail(url, company) {
      const adapter = adapterUntuk(url);
      if (!adapter) return null;
      const hasil = await adapter.ambilDetail(url, ioDefault, {
        perusahaan: company,
      });
      if (!hasil) return null;
      return {
        bahan: hasil.bahan,
        tags: hasil.tags ?? [],
        source: namaPapan(url) ?? adapter.nama,
      };
    },
    email: extractEmail,
    domainAge: cachedDomainAge,
    audit: auditPosting,
    score: (text) => scoreText({ text }),
    save: upsertPosting,
  };
}

export interface RunDeps {
  scan?: typeof runScan;
  readPipeline?: (root: string) => Promise<string>;
  keys?: () => Promise<ReadonlySet<string>>;
  ingest?: typeof ingestScan;
  finish?: typeof finishScanRun;
  /** Days to ask the scanner for. Defaults to the incremental window. */
  window?: () => Promise<number>;
}

async function defaultReadPipeline(root: string): Promise<string> {
  return readFile(path.join(root, "data", "pipeline.md"), "utf8");
}

/** The scanner's own default window, and the never-exceed bound. */
const MAX_WINDOW_DAYS = 30;

/**
 * Days the next scan should ask for.
 *
 * Careevo's engine can re-read a whole month, but Lumina already holds the
 * corpus: re-scanning 30 days every time re-fetches pages for rows it already
 * has. The window therefore starts at the last successful run (plus one day of
 * overlap for late edits), and only falls back to 30 days when there is no
 * successful run yet.
 */
export function scanWindowDays(
  lastFinishedAt: string | null,
  now = Date.now(),
): number {
  if (!lastFinishedAt) return MAX_WINDOW_DAYS;
  const finishedAt = Date.parse(lastFinishedAt);
  if (!Number.isFinite(finishedAt)) return MAX_WINDOW_DAYS;
  const age = now - finishedAt;
  if (age < 0) return MAX_WINDOW_DAYS;
  return Math.min(
    MAX_WINDOW_DAYS,
    Math.max(1, Math.ceil(age / 86_400_000) + 1),
  );
}

async function defaultWindow(): Promise<number> {
  try {
    return scanWindowDays(await lastSuccessfulScanFinishedAt());
  } catch {
    return MAX_WINDOW_DAYS;
  }
}

/**
 * One scan run, from the child process to the run row.
 *
 * Never throws: every failure becomes a `failed` run row, because the UI polls
 * that row and a silent rejection would leave it `running` forever.
 */
export async function runScanJob(
  runId: number,
  deps: RunDeps = {},
): Promise<void> {
  const scan = deps.scan ?? runScan;
  const readPipeline = deps.readPipeline ?? defaultReadPipeline;
  const keys = deps.keys ?? readPostingKeys;
  const ingest = deps.ingest ?? ingestScan;
  const finish = deps.finish ?? finishScanRun;
  const window = deps.window ?? defaultWindow;

  let result: ScanRunResult;
  try {
    const outcome = await scan({ since: await window() });
    if (!outcome.ok) {
      result = {
        status: "failed",
        found: 0,
        added: 0,
        dropped: 0,
        exitCode: outcome.exitCode,
        providerErrors: [],
      };
    } else {
      const root = scanDataDir();
      let markdown = "";
      try {
        markdown = await readPipeline(root);
      } catch {
        markdown = "";
      }

      // This run's new rows, then the newest unimported rows already in the
      // cumulative pipeline. Without the backlog, fixing ingest would never
      // surface the rows a failed earlier run left behind.
      const wanted = new Set(
        outcome.receipt.added_urls
          .map((url) => normalisasiKunciUrl(url))
          .filter(Boolean),
      );
      const inbox = parseInbox(markdown);
      const existing = await keys();
      const fromThisRun = inbox.filter((row) => {
        if (row.done) return false;
        const key = normalisasiKunciUrl(row.url);
        if (!key) return false;
        // A URL already in the corpus is not re-fetched: the row's audit is
        // stored, and re-upserting it would only move an old posting to the top
        // of the "newest" list.
        return wanted.has(key) && !existing.has(key);
      });
      const backlog = inbox
        .filter((row) => {
          if (row.done) return false;
          const key = normalisasiKunciUrl(row.url);
          // A placeholder URL has no key; retrying it every scan would burn a
          // backlog slot forever.
          if (!key) return false;
          return !existing.has(key) && !wanted.has(key);
        })
        .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))
        .slice(0, BACKFILL_LIMIT);
      const rows = [...fromThisRun, ...backlog];

      const { added, dropped } = await ingest(rows, runId, realIngestDeps());

      result = {
        status: "ok",
        found: outcome.receipt.found,
        added,
        dropped,
        exitCode: outcome.exitCode,
        providerErrors: outcome.receipt.errors,
      };
    }
  } catch {
    result = {
      status: "failed",
      found: 0,
      added: 0,
      dropped: 0,
      exitCode: null,
      providerErrors: [],
    };
  }

  try {
    await finish(runId, result);
  } catch {
    // The run row is the UI's only signal. A failed report write must not throw
    // out of a fire-and-forget job, and must not re-classify a successful scan.
  }
}
