# Loker tool — job search, scan, and audit — design

**Date:** 2026-11-09
**Status:** Approved design, not implemented
**Source of truth:** this file. Plan not written yet.
**Reference implementation:** `/home/vyns/Documents/github/careevo`
(`src/lib/jobs/filters.ts`, `kueri-chat.ts`, `src/lib/career-ops/*`,
`src/lib/agents/sentinel.ts`, `engine/`)

---

## 0. Goal and non-goals

### Goal

Give the companion a real job-search tool backed by Careevo's scanner, audit,
and filter system:

a. the model chooses a `job_search` tool call from natural language;
b. a tool card in the transcript renders matching postings;
c. every posting carries **two** verdicts: Careevo's Sentinel audit and
   Lumina's own `scoreText()`;
d. filters are Careevo's pure predicates: query terms, location, salary band,
   hide-flagged;
e. a background scan refreshes the corpus; the tool always searches the
   cumulative corpus, newest first;
f. saved postings live on the device and appear in `/profil`;
g. the whole thing degrades gracefully when the LLM is offline (chip + cached
   results).

### Non-goals

a. No change to the message-checking pipeline. `scoreText()` still owns the
   message verdict; the loker tool is a separate surface.
b. No auto-apply, no CV generation, no tracker. Careevo's application features
   stay out.
c. No server-side search endpoint for the user's query. The client filters a
   bounded snapshot (see §7).
d. No new UI dependency. `lucide-react`, shadcn, and the existing tokens only.
e. No telemetry of postings, queries, or saved jobs.

---

## 1. Ground truth (read from the repo and the environment)

a. `src/app/api/companion/answer/route.ts` posts to
   `${LUMINA_LLM_URL}/chat/completions` with no `tools` field and reads only
   `choices[0].message.content`. Deadline 20 s, `max_tokens` 800.
b. **Probe 2026-11-09:** the configured endpoint (`ag/gemini-3.8-flash` via
   `127.0.0.1:20128/v1`) returns native `tool_calls` with
   `finish_reason: "tool_calls"` and `arguments: {"query":"React remote Jakarta"}`
   when given a `job_search` schema. Native tool calling is available.
c. `StageId = AgentId | "voice"` is a closed union in
   `src/lib/contracts/agent-run.ts:24`. `STAGE_LABEL` is a total record.
d. `src/lib/scoring/score.ts` exposes `scoreText()` and `scoreWithTrace()`;
   the job/link detectors already read posting-shaped text.
e. Careevo's scanner is not a library: `engine/` is ~15 MB of `.mjs` scripts
   spawned as a subprocess (`runEngine`, 230 s default, 5 min for `scan.mjs`),
   writing to a data root (`pipeline.md`, `scan-runs.tsv`).
f. Careevo's audit is `auditLoker()` over `deteksiFee()` (Indonesian fee rules)
   and `nilaiKepercayaan()` (URL/domain trust), producing
   `clean | suspicious | rejected` plus flags.
g. Careevo's filters are pure and tested: tiered location with word boundaries,
   content keywords, salary range-overlap, `parseRentangGaji`.
h. AGENTS.md's "Aturan keras" section was removed on 2026-11-09 at the owner's
   request. The remaining "Batas privasi" section still applies: the checked
   message never leaves the device, the model is never asked to score, and no
   verbatim quote is sent.

---

## 2. Decisions (grilling record)

| # | Decision |
|---|---|
| Q1 | Full feature, post-submission; spec now, implementation after 10 Nov |
| Q2/Q25 | Real data, live scanner (supersedes the earlier bundled-JSON answer) |
| Q3/Q7 | Server loads the catalog, client renders and filters |
| Q4 | Inline tool card in the transcript |
| Q5 | Tool on the existing `job` agent; no new detector |
| Q6 | The user's search query never leaves the device |
| Q8/Q12 | The model chooses the tool (native tool calling) |
| Q9 | List + expandable detail + save |
| Q10/Q24 | Two verdicts: Sentinel **and** Lumina `scoreText` |
| Q11 | Additive `StageId: "job-search"` |
| Q13/Q14 | Two-phase: tool call → results → one-sentence model summary |
| Q15 | Saved jobs in `localStorage` + a `/profil` section |
| Q16/Q18/Q19 | Port Careevo's full audit system |
| Q20 | Model emits structured filters |
| Q21 | Real postings, live scan |
| Q22 | Query + location + salary + hide-flagged |
| Q23 | Summary sees titles + verdicts only |
| Q26/Q29 | Enrich, then require all audit fields; RDAP for domain age |
| Q27 | Vendor the engine under `scanner/` |
| Q28 | Search the cached scan; refresh in the background |
| Q30 | PostgreSQL tables |
| Q31 | Signed-in + rate-limited refresh |
| Q32 | Always show a "Cari lowongan" chip |

---

## 3. Data model

New numbered migration `migrations/002_loker.sql` (001 is the only existing
migration). No application code creates tables.

```sql
create table loker_scan_runs (
  id            bigserial primary key,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running', -- running | ok | failed
  found         int  not null default 0,
  added         int  not null default 0,
  dropped       int  not null default 0,          -- missing required audit data
  provider_errors jsonb not null default '[]',
  exit_code     int,
  triggered_by  text
);

create table loker_postings (
  url_key          text primary key,              -- normalised URL
  run_id           bigint references loker_scan_runs(id) on delete set null,
  title            text not null,
  company          text not null,
  location         text,
  salary_min       bigint,
  salary_max       bigint,
  salary_currency  text,
  tags             text[] not null default '{}',
  description      text not null,
  apply_url        text,
  source           text not null,
  posted_at        date,
  company_email    text not null,
  domain_age_days  int  not null,
  employer_known   boolean not null,
  sentinel_status  text not null,                 -- clean | suspicious | rejected
  sentinel_flags   text[] not null default '{}',
  trust_score      int  not null,
  trust_level      text not null,
  lumina_score     int  not null,
  lumina_risk      text not null,
  lumina_signals   jsonb not null,
  fetched_at       timestamptz not null default now()
);

create table loker_domain_cache (
  domain     text primary key,
  age_days   int,
  status     text not null,                       -- ok | unknown | error
  checked_at timestamptz not null default now()
);

create index loker_postings_posted_at_idx on loker_postings (posted_at desc nulls last);
create index loker_postings_sentinel_idx  on loker_postings (sentinel_status);
create index loker_postings_tags_idx      on loker_postings using gin (tags);
```

a. `url_key` is the dedupe key, produced by a ported `normalisasiKunciUrl`.
b. `company_email`, `domain_age_days`, `employer_known` are `not null`: a row
   that cannot fill them is not inserted (Q26).
c. The visible corpus is **cumulative**, not latest-run-only: all
   `loker_postings`, newest `fetched_at` first, capped at 300 by the RSC loader
   (see §7). `run_id` is provenance, so a small refresh never hides older rows.
d. `lumina_signals` stores `{label, weight}[]` only — no `evidence` quotes are
   persisted, matching the digest convention.

### 3.1 File map

| File | Role |
|---|---|
| `migrations/002_loker.sql` | three tables |
| `scanner/` | vendored career-ops engine + portals + licence |
| `src/lib/loker/bootstrap.ts` | data root, write-once portals/skeletons |
| `src/lib/loker/scan.ts` | spawn, receipt parsing, run lifecycle |
| `src/lib/loker/store.ts` | parameterized upsert + cumulative query |
| `src/lib/loker/enrich.ts` | email extraction + RDAP domain age |
| `src/lib/loker/audit/sentinel.ts` | ported Sentinel audit |
| `src/lib/loker/filters.ts` | ported location/content/salary filters |
| `src/lib/loker/query.ts` | `uraiKueri`, `teksLoker` |
| `src/lib/loker/types.ts` | row and view types |
| `src/lib/contracts/tool.ts` | tool args, call, summary schemas |
| `src/lib/companion/tool-client.ts` | `requestToolSummary()` |
| `src/lib/contracts/agent-run.ts` | `StageId` gains `job-search` |
| `src/app/api/loker/scan/route.ts` | signed-in refresh trigger |
| `src/app/api/loker/scan/status/route.ts` | run status polling |
| `src/app/api/companion/tools/summary/route.ts` | phase-2 summary |
| `src/app/api/companion/answer/route.ts` | tool schema + `toolCalls` |
| `src/components/companion/loker-tool.tsx` | card, filters, states |
| `src/components/companion/loker-card.tsx` | one posting + both verdicts |
| `src/components/companion/companion-chat.tsx` | tool flow + trace stage |
| `src/components/companion/companion-with-session.tsx` | RSC corpus loader |
| `src/components/companion/composer.tsx` | "Cari lowongan" chip |
| `src/app/(app)/profil/page.tsx` | saved-jobs section |
| `docs/loker-tool.md` | feature doc |

---

## 4. Scanner

### 4.1 Vendoring

```
scanner/                 byte-identical copy of careevo/engine
scanner/portals.yml      copy of careevo src/lib/career-ops/portals-careevo.yml
scanner/LICENSE          career-ops MIT licence
scanner/ATTRIBUTION.md   career-ops + Careevo provenance
```

`scanner/` is excluded from Biome and from `tsc` (`.mjs`, not app source).
Only `scan.mjs` is invoked; the rest of the engine ships untouched because
trimming it is what breaks its internal imports.

The copied `portals.yml` is Careevo's own seed: 36 enabled entries, mostly
Jobstreet Indonesia (12 pages per role), Kalibrr, Glints, and Dealls. Glints is
WAF-blocked and may return zero over plain HTTP; Jobstreet is the reliable path.
That is a data-quality caveat, not a code defect.

### 4.2 Invocation

`src/lib/loker/scan.ts`:

```ts
runScan({ since = 30, timeoutMs = 300_000 })
  → spawn(process.execPath, ["scanner/scan.mjs", "--json", "--quiet",
                             "--since", String(since)], {
      cwd: scannerDir,
      env: { ...process.env,
             CAREER_OPS_ROOT: scanDataDir(),
             CAREER_OPS_TRACKER: join(scanDataDir(), "applications.md") },
    })
```

a. `scanDataDir()` = `process.env.LOKER_SCAN_DATA_DIR ?? <cwd>/.scan-data`,
   gitignored, created on demand, writable by the container UID.
b. The engine resolves its root through its own `path-resolver.mjs`, honouring
   `CAREER_OPS_ROOT` above every other rule. We set it explicitly; the engine is
   never allowed to write into `scanner/`.
c. **First-run bootstrap:** create the data root and copy `scanner/portals.yml`
   to `$CAREER_OPS_ROOT/portals.yml` **write-once** (never replace an existing
   file), plus the empty `data/pipeline.md`, `data/applications.md`, and
   `data/scan-history.tsv` skeletons. This is the port of Careevo's
   `bootstrapCareerOps`.
d. Receipt contract: exit 0 = success; **exit 2 = completed with provider
   errors and a valid receipt**; exit 1 = fatal, no receipt. Success is
   "a receipt with a numeric `added`", never the exit code alone.
e. The receipt's provider errors are stored in `loker_scan_runs.provider_errors`.
f. **Runtime dependency:** `scan.mjs` imports `js-yaml`; it is the only bare
   package on the scan path. Add `js-yaml` to Lumina's dependencies so Node
   resolves it from the app's `node_modules` (the engine has no
   `node_modules`). `dotenv`, `@google/generative-ai`, and `playwright` are
   declared by the engine but are not reached by `scan.mjs`; they are not
   installed.

### 4.3 Serial execution

A Postgres advisory lock (`pg_try_advisory_lock(hashtext('loker_scan'))`)
wraps the run. A second trigger returns `409 scan-running` and the UI keeps
polling. This mirrors Careevo's in-process serial queue but survives multiple
Node processes. The engine's own `pipeline-lock.mjs` (a cross-process file lock
on `data/pipeline.md`) still applies inside the child; our advisory lock is an
additional outer guard, not a replacement.

Routes:

a. `POST /api/loker/scan` — session required, rate-limited, starts a run,
   returns `202 {runId}` or `409 scan-running`.
b. `GET /api/loker/scan/status` — returns the latest run's
   `{status, found, added, dropped, finishedAt}`; the card polls this while a
   scan runs, then calls `router.refresh()` so the RSC reloads the postings.

### 4.4 Import and enrichment

1. Parse `$CAREER_OPS_ROOT/data/pipeline.md` with a ported `parseInbox`
   (Careevo `pipeline-table.ts`). No re-implementation of scan rules.
2. For each row, in order:
   a. normalise the URL; **upsert** by `url_key`: update audit, score, and
      `fetched_at` when the row already exists, insert when it does not. A
      re-scan never creates a duplicate row;
   b. extract `company_email` from the description/company text (first email);
   c. resolve `domain_age_days` from `apply_url`'s hostname:
      - cache hit in `loker_domain_cache` → use it;
      - miss → `GET https://rdap.org/domain/<domain>`, parse the `registration`
        event, write the cache;
      - failure → write a short-lived `status='error'` cache entry, mark the row
        `dropped`, and skip it;
   d. `employer_known` = company is present and not a generic placeholder;
   e. run the audit (§5) and `scoreText()` (§5);
   f. insert or update the row.
3. Finish the run row with `found`, `added`, `dropped`, `status`. Exit 2 with a
   valid receipt is `status='ok'` plus `provider_errors`, not `failed`.
4. The card reports `added` and `dropped` honestly ("N dibuang: data audit
   tidak lengkap").

No network call happens in tests; RDAP and the engine are injected/fixtured.

---

## 5. Audit

### 5.1 Sentinel (ported)

`src/lib/loker/audit/sentinel.ts`, ported from Careevo's `sentinel.ts`,
`rules/fee-rules.ts`, and `jobs/trust.ts`, with the original attribution
comments preserved.

```ts
auditPosting(input: {
  title, company, description, apply_url, company_email,
  domain_age_days, employer_known,
}): {
  status: "clean" | "suspicious" | "rejected";
  flags: string[];
  feeFlags: string[];
  trustFlags: string[];
  trustScore: number;
  trustLevel: TrustLevel;
}
```

The escalation policy is copied exactly: `link_apk` or two independent content
signals or an unparseable URL escalates; a weak structural flag never rejects
alone.

### 5.2 Lumina score

```ts
scorePosting(input) = scoreText([
  input.title, input.company, input.description, input.apply_url ?? "",
].join("\n"))
```

This reuses the existing `job` and `link` detectors. It produces
`{score, risk, signals}`; only `{label, weight}` is persisted.

### 5.3 Display rule

The card shows both verdicts. When they disagree, the card states it
explicitly, e.g. `Sentinel: bersih · Lumina: mencurigakan`, and the caution
wins: the posting is treated as flagged for the "hide flagged" filter and the
detail copy explains why. There is no silent authority.

---

## 6. Search and filters

Ported into `src/lib/loker/filters.ts` and `src/lib/loker/query.ts`:

a. `buatFilterLokasi` — `block_hard → always_allow → block → allow`,
   word-boundary matchers, missing data passes.
b. `buatFilterKonten` — positive/negative keywords, OR within a list.
c. `buatFilterGaji` + `parseRentangGaji` — range overlap, `jt`/`juta`/`rb`/`ribu`.
d. `uraiKueri` — strip filler, return terms; the caller requires **all** terms.
e. `teksLoker` — title + description + location + tags.

Client pipeline order: query terms (AND) → location → salary → hide-flagged.
`hideFlagged` hides a posting when `sentinel_status !== "clean"` **or**
`lumina_risk` is `mencurigakan`/`tinggi`.

---

## 7. Tool protocol

### 7.1 Contracts

New additive `src/lib/contracts/tool.ts`:

```ts
JobSearchArgsSchema = z.object({
  query: z.string().min(1).max(200),
  location: z.string().max(80).optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  hideFlagged: z.boolean().optional(),
}).strict();

ToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("job_search"),
  arguments: JobSearchArgsSchema,
}).strict();

ToolSummaryRequestSchema = z.object({
  count: z.number().int().min(0),
  postings: z.array(z.object({
    title: z.string(),
    company: z.string(),
    sentinelStatus: z.enum(["clean", "suspicious", "rejected"]),
    luminaRisk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
  }).strict()).max(20),
}).strict();
```

`src/lib/contracts/answer.ts` gains an optional `toolCalls` on the response
type only. `AgentStage`/`StageId` gain `"job-search"` (§9).

### 7.2 Phase 1 — the model chooses

`/api/companion/answer` adds `tools: [job_search]` and `tool_choice: "auto"` to
the upstream request in **every** lane, and returns:

```json
{ "ok": true, "text": "", "toolCalls": [{ "id": "...", "name": "job_search",
  "arguments": { "query": "...", "location": "...", "salaryMin": 8000000 } }] }
```

The route validates `arguments` against `JobSearchArgsSchema`; an invalid
argument set is dropped, not forwarded. `text` may be empty when the model only
calls the tool.

The tool is offered in every lane (the owner's choice), and the system prompt
tells the model to call it only when the user asks for a job search. The route
does not hard-block a `periksa` call: a model that calls it there gets the card
after the verdict, with no evidence in the arguments.

### 7.3 Phase 2 — the summary

New `/api/companion/tools/summary`:

a. session not required (same posture as `/answer`), rate-limited, 20 s deadline;
b. body validated by `ToolSummaryRequestSchema` — titles, companies, verdicts,
   and the true `count`; **the query is not sent** (Q23). The client sends the
   first 20 filtered results;
c. system prompt: one sentence, no scoring, no new findings;
d. `503 not-configured` falls back to deterministic copy on the client.

### 7.4 Client flow

1. `requestAnswer()` returns `{outcome, text, toolCalls}` (the existing outcome
   field is preserved).
2. If a `job_search` call is present: filter the RSC-loaded postings locally,
   render `<LokerToolCard>`, append a `job-search` stage to the trace.
3. Call the summary route with the result digest; render one companion bubble.
4. Render order when the model also wrote prose: its text bubble first, then the
   tool card, then the summary bubble. Empty model text is normal on a tool turn.
5. The "Cari lowongan" chip opens the card with empty filters and **no** model
   call; the summary is skipped.
6. Empty results render the honest empty state; the summary still runs only if
   the model was involved.

### 7.5 The 300-posting cap

The loader is `src/components/companion/companion-with-session.tsx` (already a
server component): it queries the cumulative corpus, newest first, and passes it
through `CompanionChat` as props. The client filters that snapshot, so the user's
query never leaves the device. The loader enforces a serialization budget (~500 KB);
if 300 postings exceed it, it lowers the cap and the card prints the real
number. The card discloses the cap ("menampilkan 300 lowongan terbaru dari N
hasil pindai"). Unlimited search would require a server query endpoint and is
explicitly out of scope.

---

## 8. Client surfaces

### 8.1 Tool card

`src/components/companion/loker-tool.tsx`, built from shadcn primitives:

a. header: "Pencari Lowongan", result count, last scan time, refresh button;
b. filters: query input, location chips, salary band, hide-flagged toggle;
c. results: a compact list/grid of `LokerCard` items with title, company,
   location, salary, tags, both verdicts;
d. expandable detail: description, both verdict lists, source, fetched_at,
   save/remove button;
e. states: empty, capped, dropped-rows note, scan-running, scan-failed;
f. 380 px: single column, chips wrap, no horizontal scroll.

### 8.2 Chip

Always visible in the companion composer area: "Cari lowongan". It opens the
card with no query. This is the offline path and the discoverability path.

### 8.3 Saved jobs

`localStorage["lumina-saved-loker"]` holds snapshots:
`{id, title, company, location, salaryRange, sentinelStatus, luminaRisk, savedAt}`.
A "Lowongan tersimpan" section in `/profil` lists them with remove actions and
a device-local note. Saving does not require an account.

---

## 9. Trace delta

a. `StageId` gains `"job-search"`; `STAGE_LABEL["job-search"] = { label:
   "Pencari Lowongan", task: "Mencari lowongan dari hasil pindai" }`.
b. The stage is appended only when the tool ran (model call or chip):
   `status` `selesai | gagal`, `findings: 0`, `note: "N lowongan cocok"`,
   measured `ms`. Zero results is still `selesai`; only a client-side failure is
   `gagal`.
c. `agent-run.tsx` treats it as a non-detector (like `voice`): no registry
   lookup, `Briefcase` icon, `--lumina-agent-job` tint.
d. `engineMs` subtracts both `voice.ms` and `job-search.ms` from `totalMs`;
   the header's specialist counts still exclude both. The existing test that
   pins the subtraction gains a `job-search` case.
e. `STAGE_LABEL` is a total record, so the typecheck forces the new entry.
f. **Coordination:** the additive `StageId` change is announced to the other
   three owners before commit.

---

## 10. Privacy and security

a. The checked message still never leaves the device. The search query is
   either typed or derived by the model from the user's own question.
b. In the `periksa` lane the model sees only the lossy digest (labels and
   weights), so a model-derived query can never contain a verbatim quote. The
   route validates tool arguments against `JobSearchArgsSchema`; free text
   longer than 200 characters is rejected.
c. Phase 2 sends titles, companies, verdict labels, and a count only — no
   query, no descriptions, no apply URLs, no saved list.
d. RDAP sends only a posting's public domain.
e. Saved jobs never leave the browser.
f. Scan trigger: session required, rate limit (1 per 10 min per client key),
   advisory lock, 5-minute child timeout, sanitized env, no shell interpolation.
g. All SQL is parameterized; tool args and summary bodies are zod-validated;
   request bodies use the existing `readJson` size limits.
h. The model is never asked to score; the summary prompt forbids new findings.

---

## 11. Deployment

a. `Dockerfile` copies `scanner/` and creates `/app/.scan-data` owned by UID
   1001. `LOKER_SCAN_DATA_DIR` defaults to that path.
b. `npm run db:migrate` adds the three tables; the app still creates nothing.
c. No new persistent volume: scan results land in PostgreSQL.
d. `GET /api/health` is unchanged (it checks the DB, not the scanner).
e. The engine runs as a child process under the same non-root user; it needs
   read access to `scanner/` and write access to `.scan-data`.

---

## 12. Test strategy

### New

a. `src/lib/loker/filters.test.ts` — ported Careevo cases (word boundaries,
   missing data passes, salary overlap, `jt`/`rb`).
b. `src/lib/loker/query.test.ts` — filler stripping, AND semantics, punctuation.
c. `src/lib/loker/audit/sentinel.test.ts` — ported Careevo cases (fee rules,
   APK, trust escalation, missing-data behaviour).
d. `src/lib/loker/scan.test.ts` — receipt parsing (exit 0, exit 2, exit 1),
   fixture-based, no subprocess.
e. `src/lib/loker/rdap.test.ts` — fixture responses, registration date parsing,
   failure → drop.
f. `src/app/api/companion/answer/route.test.ts` — tool call returned and
   validated; invalid args dropped.
g. `src/app/api/companion/tools/summary/route.test.ts` — schema, 503 fallback,
   no descriptions accepted.
h. `src/components/companion/loker-tool.test.tsx` — filters, both verdicts,
   disagreement copy, empty/capped/dropped states, save.
i. `src/components/companion/agent-run.test.tsx` — `job-search` stage renders as
   a non-detector.
j. `src/lib/loker/store.test.ts` — Postgres upsert + cumulative corpus query,
   skipped without `TEST_DATABASE_URL`.

### Updated

k. `src/lib/contracts/trace-contract.test.ts` — new `StageId` entry.
l. `companion-chat.test.tsx` — tool call renders the card; chip path skips the
   summary.

---

## 13. Risks and rejected alternatives

### Risks

a. **RDAP failure drops rows.** Mitigation: cache, one retry, honest `dropped`
   count. If the drop rate is high in practice, the "require all fields"
   decision is the first thing to revisit.
b. **Engine data root in the container.** Mitigation: explicit
   `LOKER_SCAN_DATA_DIR`, pre-created and writable; a startup check fails loudly
   rather than silently scanning into a read-only path.
c. **Five-minute scan.** Mitigation: background only, serial lock, the tool
   always reads the cumulative corpus from the last completed run.
d. **Two verdicts disagree.** Mitigation: explicit copy and caution-wins rule.
e. **15 MB vendored engine.** Mitigation: byte-identical copy, licence and
   attribution files, excluded from lint/typecheck.
f. **Contract change.** Mitigation: additive `StageId`, owner notification
   before commit.

### Rejected

a. Bundled synthetic corpus — no real data.
b. Server-side query endpoint — the query would leave the device.
c. Sentinel-only verdict — loses Lumina's score.
d. Synchronous scan — unusable inside a chat turn.
e. Separate scanner service — more infrastructure than the feature needs.
f. Model-only trigger — job search would be unreachable when the LLM is down.

---

## 14. Owner actions before implementation

a. Notify the other three owners of the additive `StageId: "job-search"`.
b. Confirm the `scanner/` licence/attribution text.
c. Update AGENTS.md's layout, route, and stream tables for `scanner/`,
   `src/lib/loker/`, `src/components/companion/loker-*`, and
   `src/app/api/loker/*` when the code lands.
d. Use `migrations/002_loker.sql` (001 is the only existing migration).
