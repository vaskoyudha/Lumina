# Loker tool — user guide

**Status:** post-submission feature. Behaviour spec: `docs/loker-tool.md`.
UI copy is Indonesian; this guide quotes the labels you will actually see.
Screenshots were captured on 2026-11-10 from a local dev corpus (300 postings)
with `LOKER_PREWARM_INTERVAL_MS=0` and are committed under
`docs/assets/loker/`.

## What it is

a. **Companion** can search a corpus of job postings collected by the Careevo
   scanner. The corpus is shared: every reader sees the same rows.
b. Each posting carries **two independent verdicts**:
   - **Sentinel** (Careevo's audit): `bersih`, `mencurigakan`, or `ditolak`.
   - **Lumina** (this app's `scoreText()`): `bersih`, `rendah`, `mencurigakan`,
     or `tinggi`.
c. When the two disagree, the card says so (`Penilaian berbeda: …`) and the
   more cautious verdict wins. A posting is never presented as safe just because
   one engine missed a signal.

Searching and saving work without an account. **Starting a new scan requires
signing in**, because a scan writes shared rows.

## Finding it

Open `/companion` and either:

a. Tap the **Cari lowongan** button in the composer (icon-only at narrow
   widths, but the accessible name stays "Cari lowongan").
b. Ask in natural language, e.g. *"cari lowongan React remote"*. The model may
   answer with a `job_search` tool call, which opens the same card with the
   filters pre-filled. The tool description tells the model to call it only for
   job-search requests, not for scam-message checks.

Tapping the button opens the card immediately with no model call, so it works
even when the model quota is exhausted.

## Reading the card

The header shows:

a. **`N dari M lowongan di perangkat ini`** — how many of the loaded postings
   currently match. `M` is the real corpus total; when the corpus is capped the
   number is still honest (see `docs/loker-tool.md`).
b. **`Terakhir dipindai <tanggal>`** — the finish time of the most recent scan
   run, not the current time.

Each posting row shows title, company, location, salary (`Rp10-15 jt`, or
`Gaji tidak dicantumkan`), source board, the two verdict badges, and tags.

### Filters

Filters run in the browser against the snapshot the page already loaded. Typing
never sends the query to a server.

| Control | Behaviour |
|---|---|
| **Kata kunci** | Case-insensitive terms, AND-ed. Matched against title, description, location, and tags. |
| **Lokasi** | Word-boundary match on the posting's location. A posting with no location passes. |
| **Gaji minimum / maksimum (Rp)** | Range **overlap**, not containment: a posting is dropped only when it sits entirely outside the band. A posting with no salary passes. |
| **Sembunyikan yang ditandai salah satu penilaian** | Keeps only postings where Sentinel is `bersih` **and** Lumina is neither `mencurigakan` nor `tinggi`. |

The "don't penalize missing data" rule is deliberate: an absent salary or
location must not silently hide a real posting.

### Searching a city — Semarang

![Pencari Lowongan filtered to software engineer in Semarang, one result
rated Aman dilamar](assets/loker/01-pencari-lowongan-semarang.png)

- The header states how many rows match and when the corpus was scanned
  (`dipindai 2026-11-10`), then counts the visible results by recommendation
  (`1 aman dilamar`).
- `Pencarian Lowongan` is free text; `Posisi & Lokasi` is matched against the
  posting's location string, so `Semarang` finds rows stored as
  `Semarang, Central Java`.
- The card shows both engine verdicts (`Sentinel: bersih`, `Lumina: bersih`)
  and one sentence of reasoning. When both engines are clean there is no
  evidence list — a list of informational signals under a safe badge reads as a
  contradiction.
- `Masuk untuk memindai` is expected for a guest: the cached corpus is readable
  without an account, but starting a new scan requires a session and is rate
  limited.

### A posting that needs checking

![IOS ENGINEER card rated Periksa dulu with Sentinel and Lumina both
mencurigakan](assets/loker/02-perlu-diperiksa.png)

- The recommendation is caution-first: `rejected`/`tinggi` becomes
  `Sebaiknya hindari`, `suspicious`/`mencurigakan` becomes `Periksa dulu`, and
  everything else is `Aman dilamar`. A disagreement between the engines is not
  averaged away; the caution wins and the card names both verdicts.
- The reason line is built only from stored engine output — Sentinel flags,
  Lumina signals with a positive weight, and a young application domain. The
  model never adds or removes a signal.
- Here both engines flagged the same apply link: a shortener (`link_pendek`)
  plus a domain that does not match the company (`domain_tidak_cocok`).

### The evidence behind the badge

![Expanded detail for IOS ENGINEER showing Sentinel notes, Lumina signals, and
audit fields](assets/loker/03-detail-bukti.png)

**Lihat detail** expands the stored evidence rather than fetching anything new.
It shows the description text (capped before storage) and:

| Field | Meaning |
|---|---|
| `CATATAN SENTINEL` | the scanner's own flags for this row, e.g. `Permintaan biaya administrasi` |
| `SINYAL LUMINA` | `scoreText()` findings, labels and weights only — no quoted text |
| `Email perusahaan` | `Tidak ditemukan` when the board publishes none; never treated as a clean pass |
| `Umur domain` | RDAP age of the apply domain; a young domain adds a reason |
| `Dipindai` / `Diposting` | when Lumina last audited the row and when the board says it was posted |
| `Buka lamaran` | outbound link to the original posting |

### Recommendation levels

| Badge | Inputs | Meaning |
|---|---|---|
| `Aman dilamar` | Sentinel `clean` and Lumina `bersih`/`rendah` | neither engine found a scam signal in the posting or the audit fields it could see |
| `Periksa dulu` | either engine `suspicious`/`mencurigakan` | at least one engine wants the reader to slow down; the reason list says why |
| `Sebaiknya hindari` | either engine `rejected`/`tinggi` | at least one engine rejects the posting outright |

The same rule drives the hide-flagged filter, so a badge and the filter cannot
disagree.

## Saving postings

Tap the bookmark button on a row. Saved postings:

a. Live in `localStorage` under `lumina-saved-loker`, capped at 200, as a small
   snapshot (title, company, location, salary text, verdicts, saved time).
b. Appear on `/profil` with the same two badges and a **Hapus** button.
c. Never leave the device and need no account.
d. Disappear if the reader clears site data or uses a different device/browser.

## Refreshing the corpus

### Manual scan

**Pindai ulang lowongan** starts a background scan:

a. Signed out, the button is disabled and reads **Masuk untuk memindai**.
b. Signed in, the scan is accepted with `202` and the card polls the run every
   three seconds until it settles.
c. One scan at a time, enforced by a PostgreSQL advisory lock shared with the
   prewarm scheduler (`src/lib/loker/start.ts`). A second trigger while a run is
   active gets `409` (shown as already running), not a second scan.
d. The rate limit is **one scan per 10 minutes per client key**. Retrying inside
   the window gets `429`.
e. A scan can take minutes. The card keeps reading the rows already committed,
   so searching is never blocked by a running scan.
f. A re-scan only ingests the postings that run reported as newly added; it does
   not re-fetch the whole history.

The scan subprocess has a five-minute ceiling and receives a sanitized
environment — no database URL, OAuth secret, or model key.

### Keeping the corpus warm

a. `src/instrumentation.ts` starts the prewarm scheduler at boot; it runs one
   scan shortly after startup and then one per `LOKER_PREWARM_INTERVAL_MS`
   (default `21600000`, six hours). `0` disables the warm-up, not the
   `Pindai ulang` button.
b. The scheduler and the manual trigger share one PostgreSQL advisory lock
   (`src/lib/loker/start.ts`), so they can never crawl at the same time.
c. While ingest is still writing, `GET /api/loker/scan/status` reports the live
   row count. The card compares it with the snapshot it was rendered from and
   calls `router.refresh()` when it grows, throttled to one refresh per eight
   seconds because the payload can reach ~500 KB. Rows appear as they commit,
   not only when the run settles.
d. On a brand-new database the first minutes still show `belum dipindai`; the
   warm-up removes the cold start only after it has completed once.

### Incremental scanning

A rescan does not ask the boards for the same month again:

a. The requested window is the number of days since the last successful run plus
   one day of overlap, capped at 30. Only a database with no successful run asks
   for the full month.
b. URLs already present in `loker_postings` are skipped, so an unchanged posting
   is not fetched or audited twice.
c. A refresh also backfills up to 200 unimported `pipeline.md` rows, newest
   posted first, so an existing corpus does not need a full rescan to grow.
d. `fetched_at` is refreshed when a posting is re-audited; the ordering of the
   visible corpus follows it.

## Privacy

a. The message the reader is checking never leaves the device.
b. The job query is typed (or derived from the reader's own question), filtered
   locally, and never sent to a search endpoint.
c. The optional one-sentence summary sends only a count plus titles, companies,
   and verdict labels. Its request schema has no field for the query, a
   description, an apply URL, or the saved list.
d. RDAP lookups send only a posting's public domain.
e. The model never assigns a score and never adds or removes signals.

## When the model is unavailable

If `LUMINA_LLM_URL` / `LUMINA_LLM_MODEL` are unset, or the upstream call fails,
the summary bubble falls back to deterministic copy that states the count
truthfully. The search card itself is unaffected — filtering and saved postings
are entirely local.

## Honest limits

a. `Aman dilamar` means both engines found no scam signal in the posting and the
   audit fields they saw. It is not a guarantee: the scan cannot see a phone
   call, a chat message, or an offer made after applying.
b. The corpus is capped at 300 postings or ~500 KB, whichever comes first. The
   card prints the real count and the corpus total when the cap applies.
c. A scan can take minutes. It runs in the background and is serialized.
d. If the database is restored from an old dump, the incremental window trusts
   the run table in that dump; with no successful run the first scan asks for the
   full month again.
e. Free model quota can make the summary sentence unavailable. The
   deterministic recommendation and its reason line do not depend on the model.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Card is empty (`0 dari 0`) | No postings have been ingested yet. Run a scan (signed in) or check `npm run db:migrate`. |
| Button says **Masuk untuk memindai** | Start scan requires a session. Sign in via `/masuk`. |
| Trigger returns `429` | One scan per 10 minutes per client key. Wait out the window. |
| Trigger returns `409` | Another scan is already running; the card will reflect that run. |
| Trigger returns `503 unavailable` | Database connection or advisory-lock query failed. Check `GET /api/health`. |
| `Terakhir dipindai` never changes | No run has settled. `GET /api/loker/scan/status` returns `204` before the first run ever completes. |
| Summary bubble missing or generic | Model not configured or upstream failed; the deterministic fallback is in use. |
| High `dropped` count in a run | A board adapter or RDAP lookup failed for those rows. Rows missing audit fields are dropped rather than inserted partially; inspect the run's `provider_errors`. |
| Posting detail missing an email/domain age | Those fields are `not null` in the schema, so such a row is dropped at ingest. A visible row always has them. |
| Search finds nothing for a term | Terms are AND-ed and matched as substrings over title/description/location/tags. Try a single broader term. |

`GET /api/health` being green only proves the database answers `SELECT 1`; it
does **not** prove the scanner or the model provider works.

## Where the code lives

| Path | Role |
|---|---|
| `src/lib/loker/run.ts` | scan orchestration, incremental window, existing-URL skip |
| `src/lib/loker/prewarm.ts` | boot + interval scheduler |
| `src/lib/loker/start.ts` | shared advisory-lock lease |
| `src/lib/loker/verdict.ts` | recommendation, reason list, sentence helpers |
| `src/lib/loker/ingest.ts` | board enrichment, Sentinel audit, `scoreText()` |
| `src/components/companion/loker-tool.tsx` | filters, header counts, progressive refresh |
| `src/components/companion/loker-card.tsx` | one posting, badges, reason line, detail panel |
| `src/app/api/loker/scan/status/route.ts` | latest run + live corpus count |

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

That pass predates the prewarm and incremental-scan changes described in
`docs/loker-tool.md` (§ Operations). Re-run step (c) with `TEST_DATABASE_URL`
set before claiming current coverage.

Review screenshots for local passes stay gitignored under
`.opencode/shots/loker/` (`01-companion-desktop.png`,
`02-loker-card-desktop.png`, `03-filter-react.png`, `04-detail-suspicious.png`,
`05-hide-flagged.png`, `06-companion-380.png`, `07-loker-card-380.png`,
`08-cards-380.png`; regenerate them rather than committing). The three committed
walkthrough images live in `docs/assets/loker/`.

## Related

a. `docs/loker-tool.md` — architecture, data model, routes, environment,
   operations, honest limits.
b. `docs/superpowers/specs/2026-11-09-loker-tool-design.md` — binding design
   spec.
c. `docs/deploy.md` — container layout and release steps.
