import "server-only";
import type { ScoreResult } from "@/lib/contracts/score";
import type { AuditPosting, SentinelInput } from "@/lib/loker/audit/sentinel";
import type { BahanAudit } from "@/lib/loker/boards/types";
import type { DomainAge } from "@/lib/loker/enrich";
import { parseRentangGaji } from "@/lib/loker/filters";
import type { InboxJobShape } from "@/lib/loker/pipeline-table";
import type { PostingRow } from "@/lib/loker/store";
import { normalisasiKunciUrl } from "@/lib/loker/url-key";

export interface DetailResult {
  bahan: BahanAudit;
  tags: string[];
  source: string;
}

export interface IngestDeps {
  detail(url: string, company: string): Promise<DetailResult | null>;
  email(...texts: (string | null | undefined)[]): string | null;
  domainAge(url: string): Promise<DomainAge>;
  audit(input: SentinelInput): AuditPosting;
  score(text: string): ScoreResult;
  save(row: PostingRow): Promise<void>;
}

export interface IngestResult {
  added: number;
  dropped: number;
}

/** Descriptions are displayed, not indexed; 4 000 characters is generous. */
const MAKS_DESKRIPSI = 4_000;

/** Bounded so a 300-row refresh cannot open 300 sockets at once. */
const KONKURENSI = 4;

async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index] as T);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

async function ingestRow(
  row: InboxJobShape,
  runId: number | null,
  deps: IngestDeps,
): Promise<boolean> {
  const urlKey = normalisasiKunciUrl(row.url);
  if (!urlKey) return false;

  const detail = await deps.detail(row.url, row.company);
  if (!detail || detail.bahan.description.trim().length === 0) return false;

  const company = detail.bahan.company.trim() || row.company;
  const email = deps.email(detail.bahan.description, company);
  if (!email) return false;

  const applyUrl = detail.bahan.apply_url.trim() || row.url;
  const age = await deps.domainAge(applyUrl);
  if (age.status !== "ok" || age.ageDays === null) return false;

  const description = detail.bahan.description.slice(0, MAKS_DESKRIPSI);
  const audit = deps.audit({
    title: row.role,
    company,
    description,
    apply_url: applyUrl,
    company_email: email,
    domain_age_days: age.ageDays,
    employer_known: detail.bahan.employer_known,
  });
  const scored = deps.score(
    [row.role, company, description, applyUrl].join("\n"),
  );
  const salary = parseRentangGaji(row.compensation);

  await deps.save({
    urlKey,
    runId,
    title: row.role,
    company,
    location: row.location ?? null,
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    salaryCurrency: salary?.currency ?? null,
    tags: detail.tags,
    description,
    applyUrl,
    source: detail.source,
    postedAt: row.postedAt ?? null,
    companyEmail: email,
    domainAgeDays: age.ageDays,
    employerKnown: detail.bahan.employer_known,
    sentinelStatus: audit.status,
    sentinelFlags: audit.flags,
    trustScore: audit.trustScore,
    trustLevel: audit.trustLevel,
    luminaScore: scored.score,
    luminaRisk: scored.risk,
    // The evidence quote is deliberately not persisted.
    luminaSignals: scored.signals
      .filter((signal) => signal.weight > 0)
      .map((signal) => ({ label: signal.label, weight: signal.weight })),
  });
  return true;
}

/**
 * Turn discovered rows into audited postings.
 *
 * A row missing any audit field is `dropped` and counted, never inserted with a
 * placeholder that would make the card lie about what was checked.
 */
export async function ingestScan(
  rows: readonly InboxJobShape[],
  runId: number | null,
  deps: IngestDeps,
): Promise<IngestResult> {
  const outcomes = await mapLimit(rows, KONKURENSI, async (row) => {
    try {
      return await ingestRow(row, runId, deps);
    } catch {
      return false;
    }
  });

  const added = outcomes.filter(Boolean).length;
  return { added, dropped: outcomes.length - added };
}
