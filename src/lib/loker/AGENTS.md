# src/lib/loker — job-posting scan, audit, and corpus

## OVERVIEW
Runs the vendored `scanner/` as a subprocess, ingests postings into PostgreSQL, audits them deterministically, and serves a client-side corpus. Split into adapters (`boards/`) and an audit policy (`audit/`).

## STRUCTURE
| Area | Files |
|---|---|
| Orchestration | `run.ts` (`runScanJob`), `start.ts` (lease), `prewarm.ts`, `scan.ts` (child process) |
| Persistence | `store.ts` (SQL + scan-run lifecycle + domain cache), `ingest.ts` |
| Board adapters | `boards/index.ts` registry + `jobstreet`, `kalibrr`, `workable`, `smartrecruiters`, `dealls`, `breezy` |
| Audit | `audit/sentinel.ts` (`auditPosting`), `audit/trust.ts`, `audit/fee-rules.ts` |
| Presentation | `filters.ts`, `query.ts`, `verdict.ts`, `saved.ts`, `search.ts`, `use-saved.ts` |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Add a board | `boards/index.ts` | One adapter file + registry row; no `auditBaris` branch |
| Fee rules | `audit/fee-rules.ts` | `FEE_RULES`; never add a second fee list |
| Trust verdict | `audit/trust.ts` | `PENALTI`, `ATS_DIIZINKAN`, `FLAG_KEPERCAYAAN_KUAT` |
| URL identity | `url-key.ts` | `""` means NO KEY, never matchable; strips tracking params only |
| Search filters | `filters.ts` | Missing/unparseable location/content/salary PASSES |
| Saved jobs | `saved.ts`, `use-saved.ts` | `localStorage`, `.strict()` schema; `use-saved` is the only client file |

## CONVENTIONS (different from root)
- Indonesian domain vocabulary (`buatFilterLokasi`, `uraiKueri`, `normalisasiKunciUrl`); English infra names.
- Dependency injection over singletons: `RunDeps`, `IngestDeps`, `PrewarmDeps`, `Io`; inject `now`/`spawn`/`fetch`.
- Never-throw boundaries: `runScan`, `runScanJob`, `runLeasedScan`, `ingestScan`, `prewarmOnce`, `triggerScan`, `pollScan` return typed/fallback results.
- Pure parse vs I/O: `boards/html.ts`, `pipeline-table.ts`, `url-key.ts`, `filters.ts`, `query.ts` are pure; network in `io.ts`; DB in `store.ts`.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never edit or write `scanner/`; it runs with a minimal env allowlist and `CAREER_OPS_ROOT`.
- Never merge weak structural signals (`domain_tidak_cocok`, `tanpa_url_lamaran`) into rejection.
- Never trust an aggregator URL as the apply URL; promote an off-platform candidate (`boards/url.ts`).
- Never invent enrichment: missing email/domain age is `null` (“not checked”), never a guess.
- Never let the model write the loker verdict; audit is deterministic, `ingest.ts` uses `scoreText` for `luminaScore`.
- Never re-declare `LokerSentinelStatus`; duplicate exports fail typecheck.
