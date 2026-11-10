# Loker real-data repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the companion job-search list show real scanned postings with working apply links instead of five synthetic `demo.lumina.local` rows, and backfill the postings already sitting in `pipeline.md`.

**Architecture:** Two independent defects are fixed at their source: (1) the ingest gate drops every real posting because it requires a company email and a resolved domain age, values job boards do not publish — the Sentinel audit already accepts `null`, so the database and view types are relaxed and the UI renders the gap honestly; (2) a refresh only ingests URLs added by the current scan, so the 764 rows already in `pipeline.md` can never be imported — a bounded backlog import is added. The five `demo-seed` rows are removed from the local database and replaced by a real backfill.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, PostgreSQL via `pg`, Jest + React Testing Library, Biome.

**Spec:** `docs/superpowers/specs/2026-11-09-loker-tool-design.md` (§4.4, §5.1, §7.5; amendment dated 2026-11-10) and `docs/loker-tool.md`.

## Global Constraints

- Branch: `codex/loker-real-data`. Do not edit `main` or the community worktree.
- No new dependencies.
- `migrations/` is the only place schema changes live; the app never creates tables.
- Every row still needs a non-empty description fetched from its board adapter; a row whose detail cannot be fetched is still `dropped`, never invented.
- Missing email or domain age is stored as `null` and displayed as "Tidak ditemukan" / "Tidak diketahui". Never synthesize an address or an age.
- Apply links render only for `http:`/`https:` URLs.
- `npm run verify` must pass before handoff.

---

### Task 1: Let a real posting exist without an email or a domain age

**Files:**
- Create: `migrations/005_loker_nullable_enrichment.sql`
- Modify: `src/lib/loker/ingest.ts:57-120`, `src/lib/loker/store.ts:9-33`, `src/lib/loker/store.ts:35-59`, `src/lib/loker/types.ts:12-36`
- Test: `src/lib/loker/ingest.test.ts:139-159`

**Interfaces:**
- Produces: `PostingRow.companyEmail: string | null`, `PostingRow.domainAgeDays: number | null`, `LokerView.companyEmail: string | null`, `LokerView.domainAgeDays: number | null`.
- Produces: `ingestRow()` saves a row when `deps.email()` returns `null` and when `deps.domainAge()` returns `{status: "error"}`; `audit()` receives `company_email: null` and `domain_age_days: null`.

- [ ] **Step 1: Write the failing tests**

Replace the two drop tests in `src/lib/loker/ingest.test.ts` with:

```ts
  it("saves a row with no company email instead of hiding the posting", async () => {
    const d = deps({ email: jest.fn().mockReturnValue(null) });
    const out = await ingestScan([row()], 1, d);
    expect(out).toEqual({ added: 1, dropped: 0 });
    const saved = (d as IngestDeps & { saved: PostingRow[] }).saved;
    expect(saved[0]?.companyEmail).toBeNull();
    expect(d.audit).toHaveBeenCalledWith(
      expect.objectContaining({ company_email: null }),
    );
  });

  it("saves a row with an unresolved domain age as null", async () => {
    const d = deps({
      domainAge: jest
        .fn()
        .mockResolvedValue({ status: "error", ageDays: null }),
    });
    const out = await ingestScan([row()], 1, d);
    expect(out).toEqual({ added: 1, dropped: 0 });
    const saved = (d as IngestDeps & { saved: PostingRow[] }).saved;
    expect(saved[0]?.domainAgeDays).toBeNull();
    expect(d.audit).toHaveBeenCalledWith(
      expect.objectContaining({ domain_age_days: null }),
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/loker/ingest.test.ts`
Expected: FAIL — both tests report `added: 0, dropped: 1`.

- [ ] **Step 3: Add the migration**

Create `migrations/005_loker_nullable_enrichment.sql`:

```sql
-- Job boards publish neither a company email nor the employer's domain age.
-- Requiring them hid every real posting (764/764 dropped on 2026-11-09) and
-- left only the demo seed visible. Missing enrichment is stored as null and the
-- Sentinel audit treats null as "no identity signal" — never as a clean pass.
alter table loker_postings alter column company_email drop not null;
alter table loker_postings alter column domain_age_days drop not null;
```

- [ ] **Step 4: Let ingest pass missing enrichment through**

In `src/lib/loker/ingest.ts`, replace lines 68-74:

```ts
  const company = detail.bahan.company.trim() || row.company;
  const email = deps.email(detail.bahan.description, company);
  const applyUrl = detail.bahan.apply_url.trim() || row.url;
  const age = await deps.domainAge(applyUrl);
  const ageDays = age.status === "ok" ? age.ageDays : null;
```

and change the audit/save payload to use `ageDays`:

```ts
  const audit = deps.audit({
    title: row.role,
    company,
    description,
    apply_url: applyUrl,
    company_email: email,
    domain_age_days: ageDays,
    employer_known: detail.bahan.employer_known,
  });
```

```ts
    companyEmail: email,
    domainAgeDays: ageDays,
```

Update the function docstring's last paragraph to:

```
 * A row whose board detail cannot be fetched is `dropped` and counted, never
 * inserted with an empty description. Missing email or domain age is stored as
 * null: the board does not publish it, and the audit treats null as "not
 * checked" rather than inventing a value.
```

- [ ] **Step 5: Relax the types**

`src/lib/loker/store.ts`: change `companyEmail: string` → `companyEmail: string | null`
and `domainAgeDays: number` → `domainAgeDays: number | null` in both `PostingRow`
and `PostingDbRow` (`company_email`, `domain_age_days` in the latter).

`src/lib/loker/types.ts`: change `companyEmail: string` → `string | null` and
`domainAgeDays: number` → `number | null` in `LokerView`.

- [ ] **Step 6: Run the tests and typecheck**

Run: `npm test -- src/lib/loker/ingest.test.ts && npm run typecheck`
Expected: both pass. `store.ts` needs no mapping change because the values pass through.

- [ ] **Step 7: Commit**

```bash
git add migrations/005_loker_nullable_enrichment.sql src/lib/loker/ingest.ts src/lib/loker/ingest.test.ts src/lib/loker/store.ts src/lib/loker/types.ts
git commit -m "fix(loker): keep real postings without board-published email or domain age"
```

---

### Task 2: Render the missing audit fields honestly and only link real apply URLs

**Files:**
- Modify: `src/components/companion/loker-card.tsx:255-301`
- Test: Create `src/components/companion/loker-card.test.tsx`

**Interfaces:**
- Consumes: `LokerView` with nullable `companyEmail` / `domainAgeDays` from Task 1.
- Produces: `tautanLamaran(url: string | null): string | null` (module-local) that returns the URL only for `http:`/`https:`.

- [ ] **Step 1: Write the failing test**

Create `src/components/companion/loker-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { LokerCard } from "@/components/companion/loker-card";
import type { LokerView } from "@/lib/loker/types";

const posting = (over: Partial<LokerView> = {}): LokerView => ({
  urlKey: "https://id.jobstreet.com/job/1",
  title: "Frontend Engineer",
  company: "PT Maju",
  location: "Jakarta",
  salaryMin: null,
  salaryMax: null,
  salaryText: null,
  tags: [],
  description: "React.",
  applyUrl: "https://id.jobstreet.com/job/1",
  source: "Jobstreet",
  postedAt: null,
  fetchedAt: "2026-11-10T00:00:00.000Z",
  companyEmail: null,
  domainAgeDays: null,
  employerKnown: true,
  sentinelStatus: "clean",
  sentinelFlags: [],
  trustScore: 100,
  trustLevel: "high",
  luminaScore: 0,
  luminaRisk: "bersih",
  luminaSignals: [],
  ...over,
});

describe("LokerCard", () => {
  it("prints missing audit fields instead of inventing them", () => {
    render(
      <ul>
        <LokerCard posting={posting()} saved={false} onToggleSave={() => {}} />
      </ul>,
    );
    expect(screen.getByText("Tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByText("Tidak diketahui")).toBeInTheDocument();
  });

  it("does not render an apply link for a non-http url", () => {
    render(
      <ul>
        <LokerCard
          posting={posting({ applyUrl: "mailto:hr@maju.co.id" })}
          saved={false}
          onToggleSave={() => {}}
        />
      </ul>,
    );
    expect(
      screen.queryByRole("link", { name: /buka lamaran/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Tautan lamaran tidak tersedia.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/companion/loker-card.test.tsx`
Expected: FAIL — the first test finds `0 hari`, the second still renders the `mailto:` link.

- [ ] **Step 3: Implement the rendering rules**

In `src/components/companion/loker-card.tsx`, above `LokerCard`:

```ts
/** Only an http(s) URL can be opened as a job application. */
function tautanLamaran(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
```

Inside the component, before `return`:

```ts
  const applyUrl = tautanLamaran(posting.applyUrl);
```

Replace the age row:

```tsx
              <div>
                <dt className="text-dim">Umur domain</dt>
                <dd className="tabular text-[11px] text-txt">
                  {posting.domainAgeDays === null
                    ? "Tidak diketahui"
                    : `${posting.domainAgeDays} hari`}
                </dd>
              </div>
```

Replace `posting.applyUrl ?` with `applyUrl ?` and `href={posting.applyUrl}` with `href={applyUrl}`.

`companyEmail` already prints `posting.companyEmail || "Tidak ditemukan"`; no change needed.

- [ ] **Step 4: Run the test**

Run: `npm test -- src/components/companion/loker-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/loker-card.tsx src/components/companion/loker-card.test.tsx
git commit -m "fix(loker): show missing audit data honestly and gate apply links"
```

---

### Task 3: Backfill pipeline rows that are not in the database yet

**Files:**
- Modify: `src/lib/loker/store.ts` (add `readPostingKeys`)
- Modify: `src/lib/loker/run.ts:75-143`
- Test: `src/lib/loker/run.test.ts:36-69`
- Modify: `src/components/companion/loker-tool.tsx:369-374` (dropped-row copy)

**Interfaces:**
- Consumes: `parseInbox`, `normalisasiKunciUrl` from `receipt.ts` (already imported).
- Produces: `readPostingKeys(): Promise<Set<string>>` in `store.ts`.
- Produces: `RunDeps.keys?: () => Promise<ReadonlySet<string>>`.
- Produces: `BACKFILL_LIMIT = 200` in `run.ts`.

- [ ] **Step 1: Write the failing test**

In `src/lib/loker/run.test.ts`, add `keys: jest.fn().mockResolvedValue(new Set())` to the `deps()` base object, then add:

```ts
  it("backfills pipeline rows that are missing from the database", async () => {
    const d = deps();
    await runScanJob(9, d);
    const rows = ((d.ingest as jest.Mock).mock.calls[0] as unknown[])[0] as {
      url: string;
    }[];
    // Receipt rows 1 and 2 come first, then the unimported backlog row 3.
    expect(rows.map((r) => r.url)).toEqual([
      "https://id.jobstreet.com/job/1",
      "https://id.jobstreet.com/job/2",
      "https://id.jobstreet.com/job/3",
    ]);
  });

  it("does not re-ingest rows already stored", async () => {
    const d = deps({
      keys: jest.fn().mockResolvedValue(
        new Set(["https://id.jobstreet.com/job/3"]),
      ),
    });
    await runScanJob(9, d);
    const rows = ((d.ingest as jest.Mock).mock.calls[0] as unknown[])[0] as {
      url: string;
    }[];
    expect(rows.map((r) => r.url)).toEqual([
      "https://id.jobstreet.com/job/1",
      "https://id.jobstreet.com/job/2",
    ]);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/loker/run.test.ts`
Expected: FAIL — the backlog test sees only two rows; `keys` is not called.

- [ ] **Step 3: Add the key reader**

In `src/lib/loker/store.ts`, after `upsertPosting`:

```ts
/** Every `url_key` already stored, so a refresh can find its backlog. */
export async function readPostingKeys(): Promise<Set<string>> {
  const result = await authDatabase().query<{ url_key: string }>(
    "select url_key from loker_postings",
  );
  return new Set(result.rows.map((row) => row.url_key));
}
```

- [ ] **Step 4: Merge backlog rows into the ingest input**

In `src/lib/loker/run.ts`:

```ts
import {
  finishScanRun,
  readDomainCache,
  readPostingKeys,
  type ScanRunResult,
  upsertPosting,
  writeDomainCache,
} from "@/lib/loker/store";
```

```ts
/** Rows a single refresh may backfill, so a 764-row pipeline stays bounded. */
const BACKFILL_LIMIT = 200;
```

```ts
export interface RunDeps {
  scan?: typeof runScan;
  readPipeline?: (root: string) => Promise<string>;
  keys?: () => Promise<ReadonlySet<string>>;
  ingest?: typeof ingestScan;
  finish?: typeof finishScanRun;
}
```

```ts
  const scan = deps.scan ?? runScan;
  const readPipeline = deps.readPipeline ?? defaultReadPipeline;
  const keys = deps.keys ?? readPostingKeys;
  const ingest = deps.ingest ?? ingestScan;
  const finish = deps.finish ?? finishScanRun;
```

Replace the `wanted`/`rows` block:

```ts
      // This run's new rows, then the newest unimported rows already in the
      // cumulative pipeline. Without the backlog, fixing ingest would never
      // surface the 764 rows a failed earlier run left behind.
      const wanted = new Set(
        outcome.receipt.added_urls
          .map((url) => normalisasiKunciUrl(url))
          .filter(Boolean),
      );
      const inbox = parseInbox(markdown);
      const existing = await keys();
      const fromThisRun = inbox.filter((row) =>
        wanted.has(normalisasiKunciUrl(row.url)),
      );
      const backlog = inbox
        .filter((row) => {
          const key = normalisasiKunciUrl(row.url);
          return !existing.has(key) && !wanted.has(key);
        })
        .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))
        .slice(0, BACKFILL_LIMIT);
      const rows = [...fromThisRun, ...backlog];
```

- [ ] **Step 5: Update the dropped-row copy**

In `src/components/companion/loker-tool.tsx`, change the last-run sentence:

```tsx
              Pindai terakhir: {lastRun.added} ditambahkan, {lastRun.dropped}{" "}
              dibuang karena detail lowongan tidak bisa diambil.
```

- [ ] **Step 6: Run the run tests**

Run: `npm test -- src/lib/loker/run.test.ts src/components/companion/loker-tool.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/loker/store.ts src/lib/loker/run.ts src/lib/loker/run.test.ts src/components/companion/loker-tool.tsx
git commit -m "fix(loker): backfill unimported pipeline rows on refresh"
```

---

### Task 4: Record the amendment and repair the local corpus

**Files:**
- Modify: `docs/loker-tool.md`
- Modify: `docs/superpowers/specs/2026-11-09-loker-tool-design.md` (append amendment)
- Local database only: delete `demo.lumina.local` rows, run a backfill

- [ ] **Step 1: Update the feature doc**

In `docs/loker-tool.md`, replace the data-model paragraph:

```
`company_email` and `domain_age_days` are nullable: job boards publish neither,
and the Sentinel audit treats a missing value as "not checked" (no identity
signal) rather than a clean pass. A row whose board detail cannot be fetched is
still `dropped` and counted; it is never inserted with an invented description.
`lumina_signals` stores `{label, weight}[]` only — no evidence quotes.
```

and change the architecture note b to:

```
b. `pipeline.md` has no description, so the ported board adapters enrich each
   row before the audit. A row whose adapter cannot return a description is
   `dropped`; missing email or domain age is stored as `null` and shown as
   "Tidak ditemukan" / "Tidak diketahui".
```

- [ ] **Step 2: Append the spec amendment**

At the end of `docs/superpowers/specs/2026-11-09-loker-tool-design.md`:

```markdown
---

## 15. Amendment — 2026-11-10 (live corpus repair)

Q26 ("require all audit fields") produced zero live rows: 764/764 pipeline rows
were dropped because job boards publish no company email, and Breezy has no
resolvable domain age. The rule is amended:

a. `company_email` and `domain_age_days` are nullable in `loker_postings`.
b. Missing values are passed to the Sentinel audit as `null`; it already treats
   them as "not checked". No value is synthesized.
c. `runScanJob` also backfills up to 200 unimported `pipeline.md` rows per
   refresh (newest `posted` first), so a fixed ingest can recover an existing
   corpus without a rescan.
d. A posting still requires a fetched, non-empty description; otherwise it is
   `dropped` and counted.
```

- [ ] **Step 3: Apply the migration**

Run: `npm run db:migrate`
Expected: exits 0; `\d loker_postings` shows `company_email` and `domain_age_days` without `not null`.

- [ ] **Step 4: Delete the synthetic seed**

Run:

```bash
psql "$DATABASE_URL" -c "delete from loker_postings where url_key like 'https://demo.lumina.local/%'; delete from loker_scan_runs where triggered_by = 'demo-seed';"
```

- [ ] **Step 5: Backfill real postings from the existing pipeline**

Run the one-off importer from the worktree (temporary script, not committed):

```bash
node --experimental-strip-types --env-file=.env.local /home/vyns/.cache/tmp/loker-backfill.mjs
```

Expected: prints `added: N` with `N > 0`; `select count(*) from loker_postings` is no longer 5, and every `apply_url` starts with `https://` and is not `demo.lumina.local`.

- [ ] **Step 6: Run the full gate**

Run: `npm run verify`
Expected: exits 0.

- [ ] **Step 7: Verify in the browser**

Start the worktree dev server on port 3001, open `/companion`, send "saya ingin mencari lowongan", expand a card, and confirm the "Buka lamaran" href is the board URL. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add docs/loker-tool.md docs/superpowers/specs/2026-11-09-loker-tool-design.md
git commit -m "docs(loker): record nullable enrichment and backlog import"
```
