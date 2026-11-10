# Loker tool — scan, audit, and job search

**Status:** post-submission feature. Spec:
`docs/superpowers/specs/2026-11-09-loker-tool-design.md`.

## What it does

a. The companion can search a cumulative corpus of real postings collected by
   Careevo's career-ops scanner.
b. Every posting carries **two** verdicts: Careevo's Sentinel audit and Lumina's
   own `scoreText()`. When they disagree the card says so and the caution wins.
c. The model chooses a `job_search` tool call from natural language, or the
   reader taps "Cari lowongan" to open the same card with no model call.
d. Filters (query terms, location, salary band, hide-flagged) run in the
   browser against the RSC snapshot.
e. Saved postings live in `localStorage` and appear in `/profil`.

## Architecture

```
scanner/scan.mjs  ──►  $LOKER_SCAN_DATA_DIR/data/pipeline.md
                              │
                              ▼
        src/lib/loker/run.ts  →  ingest.ts  →  boards/*  →  RDAP
                              │                 │
                              │                 └─ Sentinel + scoreText()
                              ▼
                     PostgreSQL loker_postings
                              │
                              ▼
        companion-with-session.tsx (RSC, capped 300 / ~500 KB)
                              │
                              ▼
        companion-chat.tsx  ──►  filterPostings()  ──►  LokerTool
                              │
                              └─►  /api/companion/tools/summary (titles,
                                   companies, verdicts, count only)
```

a. The scanner is vendored byte-identical under `scanner/`; Lumina never
   re-implements its scan rules. Only `scan.mjs` is invoked.
   `scanner/.gitignore` (vendored) ignores `portals.yml` because upstream treats
   it as user config, so the seed must be force-tracked (`git add -f
   scanner/portals.yml`); without it a fresh clone cannot bootstrap.
b. `pipeline.md` has no description, so the ported board adapters enrich each
   row before the audit. A row whose adapter cannot return a description is
   `dropped`; missing email or domain age is stored as `null` and shown as
   "Tidak ditemukan" / "Tidak diketahui".
c. `url_key` is the engine's dedupe key; a re-scan upserts and refreshes
   `fetched_at` instead of duplicating rows. A refresh also backfills up to 200
   unimported `pipeline.md` rows (newest posted first), so an existing corpus
   does not need a rescan.
d. The visible corpus is cumulative, newest `fetched_at` first, capped by the
   RSC loader. The card prints the real count when the cap applies.

## Data model

`migrations/002_loker.sql` creates `loker_scan_runs`, `loker_postings`, and
`loker_domain_cache`. The app creates no tables. Run `npm run db:migrate`
before starting the app.

`company_email` and `domain_age_days` are nullable: job boards publish neither,
and the Sentinel audit treats a missing value as "not checked" (no identity
signal) rather than a clean pass. A row whose board detail cannot be fetched is
still `dropped` and counted; it is never inserted with an invented description.
`lumina_signals` stores `{label, weight}[]` only — no evidence quotes.

## Privacy boundaries

a. The checked message never leaves the device. The search query is typed by the
   reader or derived by the model from their own question; it is filtered in the
   browser and never sent to a search endpoint.
b. Phase 2 sends titles, companies, verdict labels, and a count. It has no field
   for the query, a description, an apply URL, or the saved list.
c. RDAP sends only a posting's public domain.
d. Saved postings never leave the browser.
e. The model never scores and never adds findings.

## Routes

| Route | Auth | Limit | Purpose |
|---|---|---|---|
| `POST /api/loker/scan` | session | 1 / 10 min per client key | start a background scan |
| `GET /api/loker/scan/status` | none | — | poll the latest run; `204` before any run |
| `POST /api/companion/tools/summary` | none | existing AI limit | one-sentence summary |

The scan route takes a PostgreSQL advisory lock on a dedicated pooled client and
holds it until the background job finishes. The rate limit is consumed before
the lock, so a same-client retry inside the 10-minute window gets `429`; a
trigger from another client key while a run is active gets `409`, not a second
scan. The child process has a five-minute timeout and a sanitized environment;
no shell interpolation is used.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `LOKER_SCAN_DATA_DIR` | `<cwd>/.scan-data` | scanner data root (portals, pipeline, reports) |
| `LUMINA_LLM_URL`, `LUMINA_LLM_MODEL`, `LUMINA_LLM_KEY` | — | OpenAI-compatible endpoint; unset means the tool still works from the cached corpus and the summary falls back to deterministic copy |

The data root must be writable by the app user. In the container it is
`/app/.scan-data`, created and owned by UID 1001.

## Operations

a. First deploy: `npm run db:migrate`, then start the app. The first scan seeds
   `portals.yml` and the engine skeletons.
b. A scan runs in the background; the card polls status and calls
   `router.refresh()` when the run settles.
c. The tool reads whatever rows are already committed, so a running scan never
   blocks a search; rows from the current run can appear as it progresses.
d. If RDAP or a board adapter fails, the card reports the honest `dropped`
   count. A high drop rate is a signal to revisit the "require all audit
   fields" decision, not to insert partial rows.
e. `GET /api/health` is unchanged: it checks the database, not the scanner.

## Honest limits

a. The corpus is capped at 300 postings or ~500 KB, whichever comes first. The
   card prints the real number and the total.
b. A scan can take minutes. It is background-only and serialized.
c. Two verdicts can disagree; the card names both and treats the caution as a
   flag.
d. Free model quota can make the summary unavailable; the deterministic copy is
   still honest about the count.
