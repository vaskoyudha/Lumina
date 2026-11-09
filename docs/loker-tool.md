# Loker tool — scan, audit, and job search

**Status:** post-submission feature. Spec:
`docs/superpowers/specs/2026-11-09-loker-tool-design.md`.
Screenshots and a card walkthrough: `docs/loker-guide.md`.
User-facing walkthrough: `docs/loker-tool-guide.md`.

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
f. Every card carries Lumina's recommendation (`Aman dilamar` / `Periksa dulu` /
   `Sebaiknya hindari`) with the engine evidence behind it, and the tool header
   counts the visible results by level. The recommendation is deterministic;
   the companion may repeat it, never change it.

## Architecture

```
scanner/scan.mjs  ──►  $LOKER_SCAN_DATA_DIR/data/pipeline.md
                              ▲
                              │  instrumentation.ts → lib/loker/prewarm.ts
                              │  (boot + every LOKER_PREWARM_INTERVAL_MS)
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
e. The server prewarms the corpus (`src/lib/loker/prewarm.ts`, started by
   `src/instrumentation.ts`): one scan shortly after boot and then one per
   interval, so the card opens with rows instead of "belum dipindai". The
   scheduler and the manual trigger share the same advisory lock, so they can
   never crawl concurrently. `LOKER_PREWARM_INTERVAL_MS=0` disables the warm-up
   without disabling the button.
f. A scan is incremental, like Careevo's engine: the requested window starts at
   the last successful run (plus one day of overlap) instead of always asking
   for 30 days, and a URL already in `loker_postings` is not fetched or audited
   again. Only a database with no successful run asks for the full month.
g. `src/lib/loker/verdict.ts` turns the two verdicts into one recommendation
   ("caution wins": rejected/tinggi → hindari, suspicious/mencurigakan →
   waspada, else aman) and lists the stored evidence. It is the same rule the
   hide-flagged filter uses, so badge and filter cannot disagree. The summary
   route derives the counts from the contract's existing fields and tells the
   model to repeat them; the offline fallback sentence carries them too.

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
   for the query, a description, an apply URL, or the saved list. The server
   derives the recommendation counts from those verdict labels; the schema is
   unchanged, so the client cannot add a field.
c. RDAP sends only a posting's public domain.
d. Saved postings never leave the browser.
e. The model never scores and never adds findings.

## Routes

| Route | Auth | Limit | Purpose |
|---|---|---|---|
| `POST /api/loker/scan` | session | 1 / 10 min per client key | start a background scan |
| `GET /api/loker/scan/status` | none | — | latest run + live corpus size; `204` before any run |
| `POST /api/companion/tools/summary` | none | existing AI limit | one-sentence summary |

The scan route takes a PostgreSQL advisory lock on a dedicated pooled client and
holds it until the background job finishes. The rate limit is consumed before
the lock, so a same-client retry inside the 10-minute window gets `429`; a
trigger from another client key while a run is active gets `409`, not a second
scan. The same lease helper (`src/lib/loker/start.ts`) is used by the prewarm
scheduler. The child process has a five-minute timeout and a sanitized
environment; no shell interpolation is used.

`status` carries `postings`, the current corpus count. The card compares it with
the snapshot it was rendered from and calls `router.refresh()` when it grows
(throttled to one refresh per eight seconds, because the payload is up to
~500 KB), so rows show up while ingest is still writing.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `LOKER_SCAN_DATA_DIR` | `<cwd>/.scan-data` | scanner data root (portals, pipeline, reports) |
| `LOKER_PREWARM_INTERVAL_MS` | `21600000` (6 h) | background prewarm cadence; `0` disables it |
| `LUMINA_LLM_URL`, `LUMINA_LLM_MODEL`, `LUMINA_LLM_KEY` | — | OpenAI-compatible endpoint; unset means the tool still works from the cached corpus and the summary falls back to deterministic copy |

The data root must be writable by the app user. In the container it is
`/app/.scan-data`, created and owned by UID 1001.

## Operations

a. First deploy: `npm run db:migrate`, then start the app. The first scan seeds
   `portals.yml` and the engine skeletons.
b. A scan runs in the background; the card polls status and refreshes the
   snapshot as the corpus grows, not only when the run settles.
c. The tool reads whatever rows are already committed, so a running scan never
   blocks a search; rows from the current run appear as it progresses.
d. If RDAP or a board adapter fails, the card reports the honest `dropped`
   count. A high drop rate is a signal to revisit the "require all audit
   fields" decision, not to insert partial rows.
e. `GET /api/health` is unchanged: it checks the database, not the scanner.
f. Prewarm logs nothing to the card. If it is disabled or the database is
   unreachable it simply skips; "Pindai ulang" still works.

## Honest limits

a. The corpus is capped at 300 postings or ~500 KB, whichever comes first. The
   card prints the real number and the total.
b. A scan can take minutes. It is background-only and serialized.
c. Two verdicts can disagree; the card names both and treats the caution as a
   flag.
d. Free model quota can make the summary unavailable; the deterministic copy is
   still honest about the count.
e. Prewarm removes the cold start only after it has run once. On a brand-new
   database the first minutes still show "belum dipindai"; the scheduler starts
   that crawl at boot, and the card fills in as rows commit.
f. "Aman dilamar" means both engines found no scam signal in the posting and
   the audit fields they saw. It is not a guarantee: the scan cannot see a
   phone call, a chat message, or an offer made after applying.
g. The incremental window trusts `fetched_at` and the run table. If the database
   is restored from an old dump, the first scan after restore asks for the full
   month again only when no successful run exists in that dump.

## Verifying locally

a. Apply migrations to the target database: `npm run db:migrate`.
b. Integration tests need `TEST_DATABASE_URL` pointing at a throwaway database
   whose name ends in `_test` and differs from `DATABASE_URL`. When it is set,
   Jest forces `maxWorkers: 1` because the suites reset that same database;
   without it the PostgreSQL suites are skipped.
c. Focused suite: `npm test -- src/lib/loker src/app/api/loker`.
d. Manual smoke while signed out:
   - `GET /api/loker/scan/status` returns `204` before any run, then the latest
     run row as JSON.
   - `POST /api/companion/tools/summary` with a valid body returns `200`, or
     `503 not-configured` when no model is set. Any extra field returns
     `400 invalid-request` (the schema is `.strict()`).
   - `POST /api/loker/scan` returns `401 unauthorized`.
e. Manual smoke while signed in:
   - `POST /api/loker/scan` returns `202 {ok, runId}`. A second call inside the
     10-minute window returns `429`; a concurrent call from a different client
     key returns `409 scan-running`.
   - The card polls `/api/loker/scan/status` every three seconds and calls
     `router.refresh()` once the run settles (`ok` or `failed`).

Verified on 2026-11-09 against `main` (`c2cde73`): 30 suites / 275 tests across
`src/lib/loker` and `src/app/api/loker` passed with the test database attached;
a seeded corpus rendered, filtered, and expanded correctly at 1440 px and
380 px with no horizontal overflow. The scanner subprocess itself was not
exercised in that pass (Docker was unavailable), so a first in-container scan
remains the end-to-end check.
