import "server-only";
import { authDatabase } from "@/lib/auth/database";
import type {
  LokerSentinelStatus,
  LokerView,
  ScanRunStatus,
} from "@/lib/loker/types";

export interface PostingRow {
  urlKey: string;
  runId: number | null;
  title: string;
  company: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  tags: string[];
  description: string;
  applyUrl: string | null;
  source: string;
  postedAt: string | null;
  companyEmail: string;
  domainAgeDays: number;
  employerKnown: boolean;
  sentinelStatus: LokerSentinelStatus;
  sentinelFlags: string[];
  trustScore: number;
  trustLevel: string;
  luminaScore: number;
  luminaRisk: string;
  luminaSignals: { label: string; weight: number }[];
}

interface PostingDbRow {
  url_key: string;
  title: string;
  company: string;
  location: string | null;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string | null;
  tags: string[];
  description: string;
  apply_url: string | null;
  source: string;
  posted_at: string | null;
  fetched_at: Date;
  company_email: string;
  domain_age_days: number;
  employer_known: boolean;
  sentinel_status: LokerSentinelStatus;
  sentinel_flags: string[];
  trust_score: number;
  trust_level: string;
  lumina_score: number;
  lumina_risk: LokerView["luminaRisk"];
  lumina_signals: { label: string; weight: number }[];
}

const COLUMNS = [
  "url_key",
  "run_id",
  "title",
  "company",
  "location",
  "salary_min",
  "salary_max",
  "salary_currency",
  "tags",
  "description",
  "apply_url",
  "source",
  "posted_at",
  "company_email",
  "domain_age_days",
  "employer_known",
  "sentinel_status",
  "sentinel_flags",
  "trust_score",
  "trust_level",
  "lumina_score",
  "lumina_risk",
  "lumina_signals",
] as const;

/**
 * Insert or refresh one posting.
 *
 * The conflict target is `url_key`, the engine's own dedupe key, so a re-scan
 * refreshes audit data and `fetched_at` without ever creating a duplicate.
 */
export async function upsertPosting(row: PostingRow): Promise<void> {
  const values = [
    row.urlKey,
    row.runId,
    row.title,
    row.company,
    row.location,
    row.salaryMin,
    row.salaryMax,
    row.salaryCurrency,
    row.tags,
    row.description,
    row.applyUrl,
    row.source,
    row.postedAt,
    row.companyEmail,
    row.domainAgeDays,
    row.employerKnown,
    row.sentinelStatus,
    row.sentinelFlags,
    row.trustScore,
    row.trustLevel,
    row.luminaScore,
    row.luminaRisk,
    JSON.stringify(row.luminaSignals),
  ];
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const updates = COLUMNS.filter((c) => c !== "url_key")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  await authDatabase().query(
    `insert into loker_postings (${COLUMNS.join(", ")})
     values (${placeholders})
     on conflict (url_key) do update set ${updates}, fetched_at = now()`,
    values,
  );
}

/** The cumulative corpus, newest first, plus the honest total. */
export async function loadCorpus(
  limit = 300,
): Promise<{ postings: LokerView[]; total: number }> {
  const [count, rows] = await Promise.all([
    authDatabase().query<{ total: string }>(
      "select count(*)::text as total from loker_postings",
    ),
    authDatabase().query<PostingDbRow>(
      `select
          url_key, title, company, location, salary_min, salary_max,
          salary_currency, tags, description, apply_url, source,
          to_char(posted_at, 'YYYY-MM-DD') as posted_at,
          fetched_at, company_email, domain_age_days, employer_known,
          sentinel_status, sentinel_flags, trust_score, trust_level,
          lumina_score, lumina_risk, lumina_signals
         from loker_postings
        order by fetched_at desc
        limit $1`,
      [limit],
    ),
  ]);

  return {
    total: Number(count.rows[0]?.total ?? 0),
    postings: rows.rows.map((r) => ({
      urlKey: r.url_key,
      title: r.title,
      company: r.company,
      location: r.location,
      salaryMin: r.salary_min === null ? null : Number(r.salary_min),
      salaryMax: r.salary_max === null ? null : Number(r.salary_max),
      salaryText:
        r.salary_min !== null && r.salary_max !== null
          ? `Rp${Math.round(Number(r.salary_min) / 1_000_000)}-${Math.round(
              Number(r.salary_max) / 1_000_000,
            )} jt`
          : null,
      tags: r.tags,
      description: r.description,
      applyUrl: r.apply_url,
      source: r.source,
      postedAt: r.posted_at,
      fetchedAt: r.fetched_at.toISOString(),
      companyEmail: r.company_email,
      domainAgeDays: r.domain_age_days,
      employerKnown: r.employer_known,
      sentinelStatus: r.sentinel_status,
      sentinelFlags: r.sentinel_flags,
      trustScore: r.trust_score,
      trustLevel: r.trust_level,
      luminaScore: r.lumina_score,
      luminaRisk: r.lumina_risk,
      luminaSignals: r.lumina_signals,
    })),
  };
}

export async function startScanRun(
  triggeredBy: string | null,
): Promise<number> {
  const result = await authDatabase().query<{ id: string }>(
    "insert into loker_scan_runs (triggered_by) values ($1) returning id",
    [triggeredBy],
  );
  return Number(result.rows[0]?.id);
}

export interface ScanRunResult {
  status: "ok" | "failed";
  found: number;
  added: number;
  dropped: number;
  exitCode: number | null;
  providerErrors: { company: string; error: string }[];
}

export async function finishScanRun(
  id: number,
  result: ScanRunResult,
): Promise<void> {
  await authDatabase().query(
    `update loker_scan_runs
        set status = $2, found = $3, added = $4, dropped = $5,
            exit_code = $6, provider_errors = $7, finished_at = now()
      where id = $1`,
    [
      id,
      result.status,
      result.found,
      result.added,
      result.dropped,
      result.exitCode,
      JSON.stringify(result.providerErrors),
    ],
  );
}

export async function latestScanRun(): Promise<ScanRunStatus | null> {
  const result = await authDatabase().query<{
    status: ScanRunStatus["status"];
    found: number;
    added: number;
    dropped: number;
    finished_at: Date | null;
  }>(
    `select status, found, added, dropped, finished_at
       from loker_scan_runs order by id desc limit 1`,
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    status: row.status,
    found: row.found,
    added: row.added,
    dropped: row.dropped,
    finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
  };
}

export interface DomainCacheEntry {
  ageDays: number | null;
  status: "ok" | "unknown" | "error";
  checkedAt: string;
}

export async function readDomainCache(
  domain: string,
): Promise<DomainCacheEntry | null> {
  const result = await authDatabase().query<{
    age_days: number | null;
    status: DomainCacheEntry["status"];
    checked_at: Date;
  }>(
    "select age_days, status, checked_at from loker_domain_cache where domain = $1",
    [domain],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ageDays: row.age_days,
    status: row.status,
    checkedAt: row.checked_at.toISOString(),
  };
}

export async function writeDomainCache(
  domain: string,
  ageDays: number | null,
  status: DomainCacheEntry["status"],
): Promise<void> {
  await authDatabase().query(
    `insert into loker_domain_cache (domain, age_days, status, checked_at)
     values ($1, $2, $3, now())
     on conflict (domain) do update
       set age_days = excluded.age_days,
           status = excluded.status,
           checked_at = now()`,
    [domain, ageDays, status],
  );
}
