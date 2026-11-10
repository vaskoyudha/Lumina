# Loker guide — what the job search screen shows

**Status:** post-submission feature. Behaviour spec: `docs/loker-tool.md`.
Screenshots were captured on 2026-11-10 from a local dev corpus (300 postings)
with `LOKER_PREWARM_INTERVAL_MS=0`.

## What the screen is

The companion's `job_search` tool opens a card over a cumulative corpus of real
postings collected by the vendored career-ops scanner. Each posting carries two
independent verdicts — Careevo's Sentinel audit and Lumina's own `scoreText()` —
and the card reduces them to one recommendation with the evidence behind it.
Filters run in the browser against the RSC snapshot; nothing about what you type
is sent to a search endpoint.

## a. Searching a city — Semarang

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

## b. A posting that needs checking

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

## c. The evidence behind the badge

![Expanded detail for IOS ENGINEER showing Sentinel notes, Lumina signals, and
audit fields](assets/loker/03-detail-bukti.png)

`Lihat detail` expands the stored evidence rather than fetching anything new:

| Field | Meaning |
|---|---|
| `CATATAN SENTINEL` | the scanner's own flags for this row |
| `SINYAL LUMINA` | `scoreText()` findings, labels and weights only — no quoted text |
| `Email perusahaan` | `Tidak ditemukan` when the board publishes none; never treated as a clean pass |
| `Umur domain` | RDAP age of the apply domain; a young domain adds a reason |
| `Dipindai` / `Diposting` | when Lumina last audited the row and when the board says it was posted |
| `Buka lamaran` | outbound link to the original posting |

## Recommendation levels

| Badge | Inputs | Meaning |
|---|---|---|
| `Aman dilamar` | Sentinel `clean` and Lumina `bersih`/`rendah` | neither engine found a scam signal in the posting or the audit fields it could see |
| `Periksa dulu` | either engine `suspicious`/`mencurigakan` | at least one engine wants the reader to slow down; the reason list says why |
| `Sebaiknya hindari` | either engine `rejected`/`tinggi` | at least one engine rejects the posting outright |

The same rule drives the hide-flagged filter, so a badge and the filter cannot
disagree.

## Keeping the corpus warm

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

## Incremental scanning

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
