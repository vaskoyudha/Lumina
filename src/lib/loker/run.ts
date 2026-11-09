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
  readDomainCache,
  type ScanRunResult,
  upsertPosting,
  writeDomainCache,
} from "@/lib/loker/store";
import { scoreText } from "@/lib/scoring/score";

const CACHE_TTL_MS = 30 * 86_400_000;

/**
 * Domain age, cached in Postgres.
 *
 * RDAP is the only network call enrichment makes besides the board detail
 * fetch. The cache is keyed by registrable domain, so 12 Jobstreet postings on
 * one host cost one lookup.
 */
async function cachedDomainAge(url: string): Promise<DomainAge> {
  const domain = registrableDomain(hostDari(url));
  if (!domain) return { status: "unknown", ageDays: null };

  const cached = await readDomainCache(domain);
  if (cached && cached.status !== "error") {
    const fresh = Date.now() - Date.parse(cached.checkedAt) < CACHE_TTL_MS;
    if (fresh) return { status: cached.status, ageDays: cached.ageDays };
  }

  const next = await lookupDomainAge(domain, ioDefault);
  await writeDomainCache(domain, next.ageDays, next.status);
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
  ingest?: typeof ingestScan;
  finish?: typeof finishScanRun;
}

async function defaultReadPipeline(root: string): Promise<string> {
  return readFile(path.join(root, "data", "pipeline.md"), "utf8");
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
  const ingest = deps.ingest ?? ingestScan;
  const finish = deps.finish ?? finishScanRun;

  let result: ScanRunResult;
  try {
    const outcome = await scan({ since: 30 });
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

      // Only this run's rows: `pipeline.md` is cumulative, and re-enriching the
      // whole history on every refresh would hammer the boards for nothing.
      const wanted = new Set(
        outcome.receipt.added_urls
          .map((url) => normalisasiKunciUrl(url))
          .filter(Boolean),
      );
      const rows = parseInbox(markdown).filter((row) =>
        wanted.has(normalisasiKunciUrl(row.url)),
      );

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
