# Loker tool — user guide

How to search the job corpus, read the two verdicts, save postings, and refresh
the scan. For architecture, schema, routes, and deployment see
`docs/loker-tool.md`.

UI copy is Indonesian; this guide quotes the labels you will actually see.

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

### Detail view

**Lihat detail** expands a posting to show:

a. The description text (capped before storage).
b. **Catatan Sentinel** — the audit flags, e.g. `Permintaan biaya administrasi`.
c. **Sinyal Lumina** — reasoning labels and weights. No quoted message text is
   stored or shown.
d. **Email perusahaan**, **Umur domain**, **Dipindai**, **Diposting**.
e. **Buka lamaran** — the original apply link, when the source provided one.

## Saving postings

Tap the bookmark button on a row. Saved postings:

a. Live in `localStorage` under `lumina-saved-loker`, capped at 200, as a small
   snapshot (title, company, location, salary text, verdicts, saved time).
b. Appear on `/profil` with the same two badges and a **Hapus** button.
c. Never leave the device and need no account.
d. Disappear if the reader clears site data or uses a different device/browser.

## Refreshing the corpus

**Pindai ulang lowongan** starts a background scan:

a. Signed out, the button is disabled and reads **Masuk untuk memindai**.
b. Signed in, the scan is accepted with `202` and the card polls the run every
   three seconds until it settles.
c. One scan at a time, enforced by a PostgreSQL advisory lock. A second trigger
   while a run is active gets `409` (shown as already running), not a second
   scan.
d. The rate limit is **one scan per 10 minutes per client key**. Retrying inside
   the window gets `429`.
e. A scan can take minutes. The card keeps reading the rows already committed,
   so searching is never blocked by a running scan.
f. A re-scan only ingests the postings that run reported as newly added; it does
   not re-fetch the whole history.

The scan subprocess has a five-minute ceiling and receives a sanitized
environment — no database URL, OAuth secret, or model key.

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

## Screenshots (local, not committed)

Review screenshots are intentionally gitignored (`.opencode/**/*.png`). A
verification pass on 2026-11-09 produced, under
`.opencode/shots/loker/`:

| File | Shows |
|---|---|
| `01-companion-desktop.png` | `/companion` before opening the tool |
| `02-loker-card-desktop.png` | Card open, all seeded postings |
| `03-filter-react.png` | Keyword `React` applied |
| `04-detail-suspicious.png` | Expanded detail with both verdicts and signals |
| `05-hide-flagged.png` | Flagged postings hidden |
| `06-companion-380.png` | `/companion` at 380 px |
| `07-loker-card-380.png` | Tool card at 380 px |
| `08-cards-380.png` | Posting rows at 380 px |

These are local artifacts for review; regenerate them rather than committing
them.

## Related

a. `docs/loker-tool.md` — architecture, data model, routes, environment,
   operations, honest limits.
b. `docs/superpowers/specs/2026-11-09-loker-tool-design.md` — binding design
   spec.
c. `docs/deploy.md` — container layout and release steps.
