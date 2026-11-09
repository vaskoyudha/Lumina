# Loker tool (job search, scan, audit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the companion a real `job_search` tool backed by Careevo's scanner, board adapters, Sentinel audit, and filters; render results inline with two verdicts (Sentinel + Lumina `scoreText`); keep the query on the device.

**Architecture:** A vendored career-ops engine (`scanner/`) writes `pipeline.md`; a server-only pipeline parses the receipt, enriches each new row through ported board adapters (description, apply URL, employer), resolves domain age via RDAP, runs Sentinel and `scoreText()`, and upserts into PostgreSQL. The companion page loads a capped cumulative corpus as RSC props. The model may call `job_search`; the client filters the local snapshot, renders a tool card, and asks a second route for a one-sentence summary that carries no query and no description.

**Tech Stack:** Next 16.4.5 App Router (`cacheComponents`, `after()`), React 19.3, TypeScript strict, Tailwind v4, shadcn/ui (radix), `lucide-react`, `zod` 4, PostgreSQL via `pg`, Jest 30 + React Testing Library. New runtime dependency: `js-yaml` only.

**Spec:** `docs/superpowers/specs/2026-11-09-loker-tool-design.md`

**Reference implementation (must exist on this machine):** `/home/vyns/Documents/github/careevo`

**Execution context:** `main` carries unrelated uncommitted work. The owner has asked for **no commits** until they say so; the `Commit` step at the end of each task records the intended boundary and is only run on the owner's instruction. `npm run verify` is the gate. Do not touch `src/lib/contracts/**` beyond the listed additive changes.

---

## Global Constraints

- **No new UI dependency.** `lucide-react`, shadcn primitives, and existing tokens only.
- **Only new runtime dependency:** `js-yaml` (required by `scanner/scan.mjs`). No `dotenv`, `@google/generative-ai`, or `playwright`.
- **No table creation in application code.** Only `migrations/002_loker.sql`.
- **No server-side search endpoint.** The query never leaves the device; the client filters RSC props.
- **The checked message never leaves the device.** Phase 2 sends titles, companies, verdict labels, and a count only.
- **The model never scores and never adds findings.**
- **All SQL parameterized; all request bodies zod-validated with `.strict()`.**
- **Route files must not export `runtime` or `dynamic`** (Next 16 `cacheComponents`). Use `await connection()` where request-time is required.
- **Shell must work at 380 px:** single column, chips wrap, no horizontal scroll.
- **Test style:** render real components, assert on visible text/roles; `getAllByText(...).length` for text repeated by design.
- **Ports are byte-identical first, then import paths only.** Do not "improve" ported rules; their tests are the contract.
- **Every `Commit` step is deferred** until the owner explicitly approves committing.

---

## File map

| File | Role | Task |
|---|---|---|
| `scanner/` | vendored career-ops engine, portals, licence | 1 |
| `src/lib/loker/bootstrap.ts` | data root, write-once portals/skeletons | 1 |
| `src/lib/loker/url-key.ts` | `normalisasiKunciUrl` (verbatim port) | 2 |
| `src/lib/loker/pipeline-table.ts` | `parseInbox`, `splitLines` (verbatim port) | 2 |
| `src/lib/loker/receipt.ts` | `parseScanReceipt`, `buildScanArgs`, `scanEnv` | 2 |
| `src/lib/loker/scan.ts` | spawn the engine, read stdout/stderr | 3 |
| `src/lib/loker/filters.ts` | location/content/salary filters (verbatim port) | 4 |
| `src/lib/loker/query.ts` | `uraiKueri`, `teksLoker` (verbatim port) | 5 |
| `src/lib/loker/boards/*` | ported detail adapters + registry | 6, 7 |
| `src/lib/loker/io.ts`, `src/lib/loker/jobstreet-audit.ts` | real-network `Io` + Jobstreet detail helpers | 6 |
| `src/lib/loker/audit/{sentinel,fee-rules,trust}.ts` | ported Sentinel + `auditPosting` | 8 |
| `src/lib/loker/enrich.ts` | email extraction + RDAP domain age | 9 |
| `src/lib/loker/types.ts` | `LokerView`, `SavedLoker`, `ScanRunStatus` | 10 |
| `src/lib/loker/search.ts` | `filterPostings` (pure client pipeline) | 10 |
| `migrations/002_loker.sql` | three tables + indexes | 11 |
| `src/lib/loker/store.ts` | parameterized upsert, corpus query, run rows, domain cache | 11 |
| `src/lib/loker/corpus.ts` | `capCorpus` serialization budget | 19 |
| `src/lib/loker/ingest.ts` | row → enrich → audit → score → upsert | 12 |
| `src/lib/loker/run.ts` | bootstrap → scan → ingest → finish run | 13 |
| `src/app/api/loker/scan/route.ts` | signed-in refresh trigger | 14 |
| `src/app/api/loker/scan/status/route.ts` | run status polling | 14 |
| `src/lib/loker/scan-client.ts` | `triggerScan`, `pollScan` | 14 |
| `src/lib/contracts/tool.ts` | tool args, call, summary schemas | 15 |
| `src/app/api/companion/answer/route.ts` | tool schema + `toolCalls` | 16 |
| `src/lib/companion/answer-client.ts` | `requestAnswer()` returns `toolCalls` | 16 |
| `src/app/api/companion/tools/summary/route.ts` | phase-2 summary | 17 |
| `src/lib/companion/tool-client.ts` | `requestToolSummary()` | 17 |
| `src/lib/contracts/agent-run.ts` | `StageId` gains `"job-search"` | 18 |
| `src/components/companion/agent-run.tsx` | render the non-detector stage | 18 |
| `src/components/companion/companion-with-session.tsx` | RSC corpus loader | 19 |
| `src/components/companion/loker-card.tsx` | one posting + both verdicts | 20 |
| `src/components/companion/loker-tool.tsx` | card, filters, states | 20 |
| `src/lib/loker/saved.ts` | localStorage snapshots | 21 |
| `src/lib/loker/use-saved.ts` | `useSavedLoker()` hook | 21 |
| `src/components/profil/profil-loker.tsx` | `/profil` saved-jobs section | 21 |
| `src/components/companion/companion-chat.tsx` | tool flow + trace + chip | 22 |
| `src/components/companion/composer.tsx` | "Cari lowongan" chip | 22 |
| `docs/loker-tool.md` | feature doc | 23 |
| `AGENTS.md`, `Dockerfile`, `.gitignore`, `biome.json` | deploy/config docs | 1, 23 |

---

## Task 1: Vendor the scanner, add `js-yaml`, bootstrap the data root

**Files:**
- Create: `scanner/` (copy of `/home/vyns/Documents/github/careevo/engine`)
- Create: `scanner/portals.yml` (copy of Careevo `src/lib/career-ops/portals-careevo.yml`)
- Create: `scanner/LICENSE`, `scanner/ATTRIBUTION.md`
- Create: `src/lib/loker/bootstrap.ts`
- Test: `src/lib/loker/bootstrap.test.ts`
- Modify: `package.json`, `.gitignore`, `biome.json`

**Interfaces:**
- Produces: `scanDataDir(): string`, `scannerDir(): string`, `bootstrapScanRoot(root?: string): Promise<void>`
- Produces on disk: `$root/portals.yml`, `$root/data/pipeline.md`, `$root/data/applications.md`, `$root/data/scan-history.tsv`, `$root/reports/`, `$root/jds/`, `$root/batch/tracker-additions/`

- [ ] **Step 1: Vendor the engine and its seed**

```bash
cd /home/vyns/Documents/github/Lumina
mkdir -p scanner
cp -a /home/vyns/Documents/github/careevo/engine/. scanner/
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/portals-careevo.yml scanner/portals.yml
cp /home/vyns/Documents/github/careevo/engine/LICENSE scanner/LICENSE
```

Create `scanner/ATTRIBUTION.md`:

```markdown
# Vendored career-ops engine

`scanner/` is a byte-identical copy of the career-ops engine
(https://github.com/career-ops-hq/career-ops), MIT licensed,
© 2026 Santiago Fernández de Valderrama.

It is vendored from Careevo (`/home/vyns/Documents/github/careevo/engine`)
because Lumina orchestrates the engine as a subprocess rather than
reimplementing its scan rules. Only `scan.mjs` is invoked.

`scanner/portals.yml` is Careevo's Indonesian seed
(`src/lib/career-ops/portals-careevo.yml`), copied write-once into the data
root on first run.

Do not edit files under `scanner/`. Add a new file outside it instead.
```

- [ ] **Step 2: Add the dependency and exclusions**

```bash
cd /home/vyns/Documents/github/Lumina
npm install js-yaml@^4.1.0
npm install --save-dev @types/js-yaml@^4.0.9
```

Append to `.gitignore`:

```
# career-ops scan data root (runtime user data)
/.scan-data/
```

Add to `biome.json` `files.includes` (after `"!src/data/powder"`):

```json
      "!scanner",
      "!.scan-data"
```

- [ ] **Step 3: Write the failing test**

`src/lib/loker/bootstrap.test.ts`:

```ts
/** @jest-environment node */
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { bootstrapScanRoot } from "@/lib/loker/bootstrap";

describe("bootstrapScanRoot", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "lumina-scan-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("seeds portals and the engine skeletons on first run", async () => {
    await bootstrapScanRoot(root);
    const portals = await readFile(path.join(root, "portals.yml"), "utf8");
    expect(portals).toContain("job_boards");
    const pipeline = await readFile(
      path.join(root, "data", "pipeline.md"),
      "utf8",
    );
    expect(pipeline).toContain("## Pending");
    expect(pipeline).toContain("## Processed");
    const history = await readFile(
      path.join(root, "data", "scan-history.tsv"),
      "utf8",
    );
    expect(history.startsWith("url\tfirst_seen")).toBe(true);
    await expect(stat(path.join(root, "reports"))).resolves.toBeDefined();
    await expect(stat(path.join(root, "jds"))).resolves.toBeDefined();
    await expect(
      stat(path.join(root, "batch", "tracker-additions")),
    ).resolves.toBeDefined();
  });

  it("never overwrites a file the owner already edited", async () => {
    await bootstrapScanRoot(root);
    const portalsPath = path.join(root, "portals.yml");
    await writeFile(portalsPath, "mine: true\n", "utf8");
    await bootstrapScanRoot(root);
    expect(await readFile(portalsPath, "utf8")).toBe("mine: true\n");
  });

  it("honours LOKER_SCAN_DATA_DIR when no root is passed", async () => {
    const previous = process.env.LOKER_SCAN_DATA_DIR;
    process.env.LOKER_SCAN_DATA_DIR = root;
    try {
      const { scanDataDir } = await import("@/lib/loker/bootstrap");
      expect(scanDataDir()).toBe(root);
    } finally {
      if (previous === undefined) delete process.env.LOKER_SCAN_DATA_DIR;
      else process.env.LOKER_SCAN_DATA_DIR = previous;
    }
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/bootstrap.test.ts`
Expected: FAIL — `Cannot find module '@/lib/loker/bootstrap'`.

- [ ] **Step 5: Implement `src/lib/loker/bootstrap.ts`**

```ts
import "server-only";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The career-ops data root.
 *
 * The engine resolves its own root through `path-resolver.mjs`, honouring
 * `CAREER_OPS_ROOT` above every other rule. This module is the ONE place that
 * computes it; `scan.ts` passes it explicitly, so the engine can never write
 * into the vendored `scanner/` source tree.
 */
export function scanDataDir(): string {
  const override = process.env.LOKER_SCAN_DATA_DIR?.trim();
  if (override) return path.resolve(process.cwd(), override);
  return path.join(process.cwd(), ".scan-data");
}

/** The vendored engine, source-controlled and never written to. */
export function scannerDir(): string {
  return path.join(process.cwd(), "scanner");
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/** Copied verbatim from `engine/scan.mjs` PIPELINE_SKELETON (line 2625). */
const PIPELINE_SKELETON = `# Pipeline — Pending URLs

Paste job URLs below as \`- [ ] {url}\` then run \`/career-ops pipeline\`.

## Pending

## Processed
`;

/** Copied verbatim from `engine/scan.mjs` (line 2702). */
const HEADER_SCAN_HISTORY =
  "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation\tfingerprint\tposted_at\ttrust_score\ttrust_flags\tnormalized_company\n";

/** Copied verbatim from Careevo `bootstrap.ts` HEADER_TRACKER. */
const HEADER_TRACKER = [
  "# Applications Tracker",
  "",
  "| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes | URL |",
  "|---|------|---------|-----|------|-------|--------|-----|--------|-------|-----|",
  "",
].join("\n");

/**
 * First-run seeding, idempotent and write-once.
 *
 * A user who edits their portals config must never have it replaced by the
 * shipped seed, so every write is guarded by `exists`.
 */
export async function bootstrapScanRoot(
  root: string = scanDataDir(),
): Promise<void> {
  const skeleton: Array<[string, string]> = [
    ["data/applications.md", HEADER_TRACKER],
    ["data/pipeline.md", PIPELINE_SKELETON],
    ["data/scan-history.tsv", HEADER_SCAN_HISTORY],
  ];

  for (const [rel, content] of skeleton) {
    const target = path.join(root, rel);
    if (await exists(target)) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  const portals = path.join(root, "portals.yml");
  if (!(await exists(portals))) {
    await copyFile(path.join(scannerDir(), "portals.yml"), portals);
  }

  for (const rel of ["reports", "jds", "batch/tracker-additions"]) {
    await mkdir(path.join(root, rel), { recursive: true });
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/lib/loker/bootstrap.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit (deferred — do not run without owner approval)**

```bash
git add package.json package-lock.json .gitignore biome.json scanner \
  src/lib/loker/bootstrap.ts src/lib/loker/bootstrap.test.ts
# The vendored engine's own .gitignore ignores portals.yml (it is user config
# upstream). The seed MUST be tracked or a fresh clone cannot bootstrap.
git add -f scanner/portals.yml
git commit -m "feat(loker): vendor career-ops scanner and bootstrap its data root"
```

---

## Task 2: Pure receipt, pipeline, and URL-key parsing

**Files:**
- Create: `src/lib/loker/url-key.ts` (verbatim port)
- Create: `src/lib/loker/pipeline-table.ts` (verbatim port)
- Create: `src/lib/loker/receipt.ts`
- Test: `src/lib/loker/url-key.test.ts`, `src/lib/loker/pipeline-table.test.ts`, `src/lib/loker/receipt.test.ts`

**Interfaces:**
- Produces: `normalisasiKunciUrl(raw: unknown): string`
- Produces: `parseInbox(md: string): InboxJobShape[]`, `splitLines(text: string): string[]`
- Produces: `parseScanReceipt(stdout: string, exitCode: number | null): ScanOutcome`
- Produces: `buildScanArgs(since: number): string[]`
- Types: `ScanReceipt`, `ScanOutcome`

- [ ] **Step 1: Copy the two verbatim ports**

```bash
cd /home/vyns/Documents/github/Lumina
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/url-key.ts src/lib/loker/url-key.ts
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/pipeline-table.ts src/lib/loker/pipeline-table.ts
```

Neither file imports anything, so no rewrite is needed. Do not edit the bodies.

- [ ] **Step 2: Copy the ported tests and rewrite the import paths**

```bash
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/url-key.test.ts src/lib/loker/url-key.test.ts
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/pipeline-table.test.ts src/lib/loker/pipeline-table.test.ts
```

In both copied tests, replace `"./url-key"` with `"@/lib/loker/url-key"` and
`"./pipeline-table"` with `"@/lib/loker/pipeline-table"`. If Careevo's
`pipeline-table.test.ts` imports a `__fixtures__` file, copy that fixture too
with `cp -a .../__fixtures__/pipeline-table.upstream.mjs src/lib/loker/__fixtures__/`
and keep the relative import.

- [ ] **Step 3: Write the failing receipt test**

`src/lib/loker/receipt.test.ts`:

```ts
/** @jest-environment node */
import { buildScanArgs, parseScanReceipt } from "@/lib/loker/receipt";

const RECEIPT = {
  version: "careerops.scan.receipt@1",
  date: "2026-11-09",
  scanned: 36,
  skipped: 2,
  found: 40,
  filtered: 10,
  duplicates: 4,
  added: 26,
  added_urls: ["https://id.jobstreet.com/job/1"],
  errors: [{ company: "Glints", error: "403" }],
  unverified_zero: [],
  dry_run: false,
};

describe("parseScanReceipt", () => {
  it("accepts exit 0 with a receipt", () => {
    const out = parseScanReceipt(JSON.stringify(RECEIPT), 0);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.receipt.added).toBe(26);
    expect(out.exitCode).toBe(0);
  });

  it("accepts exit 2 when a valid receipt exists", () => {
    const out = parseScanReceipt(JSON.stringify(RECEIPT), 2);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.receipt.errors).toHaveLength(1);
    expect(out.exitCode).toBe(2);
  });

  it("rejects exit 1 even if stdout happens to hold JSON", () => {
    const out = parseScanReceipt(JSON.stringify(RECEIPT), 1);
    expect(out).toEqual({
      ok: false,
      reason: "fatal",
      exitCode: 1,
    });
  });

  it("rejects a receipt without a numeric added count", () => {
    const out = parseScanReceipt(
      JSON.stringify({ version: "careerops.scan.receipt@1", added: "26" }),
      0,
    );
    expect(out.ok).toBe(false);
  });

  it("finds the receipt after dotenv noise on stdout", () => {
    const out = parseScanReceipt(
      `[dotenv] injected 4 vars\n${JSON.stringify(RECEIPT)}\n`,
      0,
    );
    expect(out.ok).toBe(true);
  });

  it("builds the exact engine arguments", () => {
    expect(buildScanArgs(30)).toEqual([
      "scanner/scan.mjs",
      "--json",
      "--quiet",
      "--since",
      "30",
    ]);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- src/lib/loker/receipt.test.ts`
Expected: FAIL — `Cannot find module '@/lib/loker/receipt'`.

- [ ] **Step 5: Implement `src/lib/loker/receipt.ts`**

```ts
import { parseInbox, splitLines, type InboxJobShape } from "@/lib/loker/pipeline-table";
import { normalisasiKunciUrl } from "@/lib/loker/url-key";

/**
 * The engine's machine-readable receipt (`scan.mjs`, `emitJsonReceipt`).
 *
 * The exit code alone is not success: `scan.mjs` exits 2 when it completed but
 * some providers failed. Success is "a receipt with a numeric `added`".
 */
export interface ScanReceipt {
  version: string;
  date: string;
  scanned: number;
  skipped: number;
  found: number;
  filtered: number;
  duplicates: number;
  added: number;
  added_urls: string[];
  errors: { company: string; error: string }[];
  unverified_zero: string[];
  dry_run: boolean;
}

export type ScanOutcome =
  | { ok: true; receipt: ScanReceipt; exitCode: 0 | 2 }
  | { ok: false; reason: "fatal" | "unparseable"; exitCode: number | null };

const VERSION = "careerops.scan.receipt@1";

function isReceipt(value: unknown): value is ScanReceipt {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === VERSION &&
    typeof v.added === "number" &&
    Number.isFinite(v.added) &&
    Array.isArray(v.added_urls) &&
    Array.isArray(v.errors)
  );
}

/**
 * Parse the last receipt line on stdout.
 *
 * `--quiet` suppresses the dotenv banner, but a stray warning can still appear
 * before the receipt, so scan every non-empty line and keep the last valid one
 * rather than assuming the whole stream is JSON.
 */
export function parseScanReceipt(
  stdout: string,
  exitCode: number | null,
): ScanOutcome {
  if (exitCode === 1) return { ok: false, reason: "fatal", exitCode };

  let receipt: ScanReceipt | null = null;
  for (const line of splitLines(stdout)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isReceipt(parsed)) receipt = parsed;
    } catch {
      // Not a JSON line; keep scanning.
    }
  }

  if (!receipt) return { ok: false, reason: "unparseable", exitCode };
  if (exitCode !== 0 && exitCode !== 2) {
    return { ok: false, reason: "unparseable", exitCode };
  }
  return { ok: true, receipt, exitCode };
}

/** The exact argv passed to `node`. Kept pure so the contract is testable. */
export function buildScanArgs(since: number): string[] {
  return [
    "scanner/scan.mjs",
    "--json",
    "--quiet",
    "--since",
    String(since),
  ];
}

export { parseInbox, normalisasiKunciUrl, splitLines };
export type { InboxJobShape };
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- src/lib/loker/receipt.test.ts src/lib/loker/url-key.test.ts src/lib/loker/pipeline-table.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit (deferred)**

```bash
git add src/lib/loker/url-key.ts src/lib/loker/pipeline-table.ts \
  src/lib/loker/receipt.ts src/lib/loker/*.test.ts src/lib/loker/__fixtures__
git commit -m "feat(loker): port receipt, pipeline, and url-key parsing"
```

---

## Task 3: Spawn the scanner

**Files:**
- Create: `src/lib/loker/scan.ts`
- Test: `src/lib/loker/scan.test.ts`

**Interfaces:**
- Consumes: `bootstrapScanRoot`, `scanDataDir`, `scannerDir` (Task 1); `buildScanArgs`, `parseScanReceipt`, `ScanOutcome` (Task 2)
- Produces: `runScan(options?: RunScanOptions): Promise<ScanOutcome>`
- Produces: `RunScanOptions = { since?: number; timeoutMs?: number; spawn?: typeof nodeSpawn }`

- [ ] **Step 1: Write the failing test**

`src/lib/loker/scan.test.ts`:

```ts
/** @jest-environment node */
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ChildProcess } from "node:child_process";
import { runScan } from "@/lib/loker/scan";

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = jest.fn();
}

const RECEIPT = {
  version: "careerops.scan.receipt@1",
  date: "2026-11-09",
  scanned: 1,
  skipped: 0,
  found: 1,
  filtered: 0,
  duplicates: 0,
  added: 1,
  added_urls: ["https://id.jobstreet.com/job/1"],
  errors: [],
  unverified_zero: [],
  dry_run: false,
};

describe("runScan", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "lumina-scan-run-"));
    process.env.LOKER_SCAN_DATA_DIR = root;
  });

  afterEach(async () => {
    delete process.env.LOKER_SCAN_DATA_DIR;
    await rm(root, { recursive: true, force: true });
  });

  it("passes the data root, tracker, and exact argv to the child", async () => {
    const child = new FakeChild();
    const spawn = jest.fn().mockReturnValue(child);

    const pending = runScan({
      since: 14,
      spawn: spawn as unknown as typeof import("node:child_process").spawn,
    });

    child.stdout.emit(
      "data",
      Buffer.from(`${JSON.stringify(RECEIPT)}\n`),
    );
    child.emit("close", 0);

    const out = await pending;
    expect(out.ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      ["scanner/scan.mjs", "--json", "--quiet", "--since", "14"],
      expect.objectContaining({
        cwd: process.cwd(),
        env: expect.objectContaining({
          CAREER_OPS_ROOT: root,
          CAREER_OPS_TRACKER: path.join(root, "applications.md"),
        }),
      }),
    );
  });

  it("reports a fatal outcome when the child cannot start", async () => {
    const child = new FakeChild();
    const spawn = jest.fn().mockReturnValue(child);
    const pending = runScan({
      spawn: spawn as unknown as typeof import("node:child_process").spawn,
    });
    child.emit("error", new Error("ENOENT"));
    expect(await pending).toEqual({
      ok: false,
      reason: "fatal",
      exitCode: null,
    });
  });

  it("returns exit 2 as a completed run with provider errors", async () => {
    const child = new FakeChild();
    const spawn = jest.fn().mockReturnValue(child);
    const pending = runScan({
      spawn: spawn as unknown as typeof import("node:child_process").spawn,
    });
    child.stdout.emit("data", Buffer.from(JSON.stringify(RECEIPT)));
    child.emit("close", 2);
    const out = await pending;
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.exitCode).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/scan.test.ts`
Expected: FAIL — `Cannot find module '@/lib/loker/scan'`.

- [ ] **Step 3: Implement `src/lib/loker/scan.ts`**

```ts
import "server-only";
import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { bootstrapScanRoot, scanDataDir } from "@/lib/loker/bootstrap";
import {
  buildScanArgs,
  parseScanReceipt,
  type ScanOutcome,
} from "@/lib/loker/receipt";

export interface RunScanOptions {
  /** Days back to scan. Careevo's default is 30. */
  since?: number;
  /** Hard ceiling; the spec allows five minutes. */
  timeoutMs?: number;
  /** Injected in tests so no real subprocess runs. */
  spawn?: typeof nodeSpawn;
}

/**
 * Run the vendored career-ops scanner and parse its receipt.
 *
 * Never throws: a missing binary, a timeout, or unparseable output is a
 * `ScanOutcome` the caller can record honestly on the run row.
 */
export async function runScan(
  options: RunScanOptions = {},
): Promise<ScanOutcome> {
  const since = options.since ?? 30;
  const timeoutMs = options.timeoutMs ?? 300_000;
  const spawn = options.spawn ?? nodeSpawn;
  const root = scanDataDir();

  await bootstrapScanRoot(root);

  return new Promise<ScanOutcome>((resolve) => {
    let settled = false;
    let stdout = "";
    let timer: ReturnType<typeof setTimeout> | undefined;

    const child: ChildProcess = spawn(process.execPath, buildScanArgs(since), {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CAREER_OPS_ROOT: root,
        CAREER_OPS_TRACKER: path.join(root, "applications.md"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const finish = (outcome: ScanOutcome) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };

    timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ ok: false, reason: "fatal", exitCode: null });
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    // stderr is drained so a chatty child cannot block on a full pipe.
    child.stderr?.on("data", () => {});
    child.on("error", () =>
      finish({ ok: false, reason: "fatal", exitCode: null }),
    );
    child.on("close", (code) =>
      finish(parseScanReceipt(stdout, code)),
    );
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/loker/scan.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit (deferred)**

```bash
git add src/lib/loker/scan.ts src/lib/loker/scan.test.ts
git commit -m "feat(loker): spawn the vendored scanner and parse its receipt"
```

---

## Task 4: Port the job filters

**Files:**
- Create: `src/lib/loker/filters.ts` (verbatim port)
- Test: `src/lib/loker/filters.test.ts` (ported)

**Interfaces:**
- Produces: `buatFilterLokasi(config?: LocationFilterConfig | null): LocationFilter`
- Produces: `buatFilterKonten(config?: ContentFilterConfig | null): ContentFilter`
- Produces: `buatFilterGaji(config?: SalaryFilterConfig | null): SalaryFilter`
- Produces: `parseRentangGaji(teks: string | null | undefined): RentangGaji | null`
- Types: `LocationFilterConfig`, `ContentFilterConfig`, `SalaryFilterConfig`, `RentangGaji`

- [ ] **Step 1: Copy the source and its test**

```bash
cd /home/vyns/Documents/github/Lumina
cp /home/vyns/Documents/github/careevo/src/lib/jobs/filters.ts src/lib/loker/filters.ts
cp /home/vyns/Documents/github/careevo/src/lib/jobs/filters.test.ts src/lib/loker/filters.test.ts
```

`filters.ts` imports nothing. In the test, replace any `"./filters"` import with
`"@/lib/loker/filters"`. Do not change a single rule or regex.

- [ ] **Step 2: Run the ported tests to verify they pass**

Run: `npm test -- src/lib/loker/filters.test.ts`
Expected: PASS. If a case fails, the copy or the import rewrite is wrong — do
not adjust the test to fit the port.

- [ ] **Step 3: Add the three cases the Lumina caller depends on**

Append to `src/lib/loker/filters.test.ts`:

```ts
describe("Lumina caller contract", () => {
  it("passes a posting whose salary is missing", () => {
    const cocok = buatFilterGaji({ min: 8_000_000, max: 15_000_000 });
    expect(cocok(null)).toBe(true);
    expect(cocok(undefined)).toBe(true);
  });

  it("passes a posting whose location is missing", () => {
    const cocok = buatFilterLokasi({ allow: ["jakarta"] });
    expect(cocok(null)).toBe(true);
  });

  it("keeps a posting whose band overlaps the requested band", () => {
    const cocok = buatFilterGaji({ min: 8_000_000, max: 15_000_000 });
    expect(cocok({ min: 12_000_000, max: 20_000_000 })).toBe(true);
    expect(cocok({ min: 3_000_000, max: 7_000_000 })).toBe(false);
  });
});
```

Add the missing import at the top of the test:

```ts
import {
  buatFilterGaji,
  buatFilterLokasi,
} from "@/lib/loker/filters";
```

- [ ] **Step 4: Run the tests again**

Run: `npm test -- src/lib/loker/filters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (deferred)**

```bash
git add src/lib/loker/filters.ts src/lib/loker/filters.test.ts
git commit -m "feat(loker): port Careevo's location, content, and salary filters"
```

---

## Task 5: Port the query splitter

**Files:**
- Create: `src/lib/loker/query.ts` (verbatim port)
- Test: `src/lib/loker/query.test.ts` (ported)

**Interfaces:**
- Produces: `uraiKueri(kueri: string): string[]`
- Produces: `teksLoker(job: { title; description; location; tags }): string`

- [ ] **Step 1: Copy the source and its test**

```bash
cd /home/vyns/Documents/github/Lumina
cp /home/vyns/Documents/github/careevo/src/lib/jobs/kueri-chat.ts src/lib/loker/query.ts
cp /home/vyns/Documents/github/careevo/src/lib/jobs/kueri-chat.test.ts src/lib/loker/query.test.ts
```

In the test, replace `"./kueri-chat"` with `"@/lib/loker/query"`.

- [ ] **Step 2: Run the ported tests**

Run: `npm test -- src/lib/loker/query.test.ts`
Expected: PASS.

- [ ] **Step 3: Add the AND-semantics case Lumina relies on**

Append to `src/lib/loker/query.test.ts`:

```ts
it("returns every term so the caller can require all of them", () => {
  expect(uraiKueri("lowongan React remote Jakarta").sort()).toEqual(
    ["jakarta", "react", "remote"].sort(),
  );
});
```

- [ ] **Step 4: Run the test again**

Run: `npm test -- src/lib/loker/query.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (deferred)**

```bash
git add src/lib/loker/query.ts src/lib/loker/query.test.ts
git commit -m "feat(loker): port the chat query splitter"
```

---

## Task 6: Port the board contract, helpers, registry, and I/O

**Files:**
- Create: `src/lib/loker/boards/{types,url,html}.ts`
- Create: `src/lib/loker/io.ts`
- Create: `src/lib/loker/jobstreet-audit.ts`
- Create: `src/lib/loker/boards/{types,url,html}.test.ts`
- Test: `src/lib/loker/boards/*.test.ts`

**Interfaces:**
- Produces: `BahanAudit`, `Io`, `PapanAdapter`, `HasilPapan`, `KonteksPapan`, `perusahaanTerkenal`
- Produces: `hostDari(url): string`, `applyUrlOffPlatform(candidate, fallback): string`
- Produces: `htmlKeTeks`, `ambilNextData`, `metaOgDescription`, `potongDivId`, `bersihkanPlaceholder`
- Produces: `ioDefault: Io` (the real-network implementation, in `src/lib/loker/io.ts`)
- Produces: `bahanAudit(listing, url): BahanAudit | null`, `jobIdFromUrl(url): string | null`

- [ ] **Step 1: Copy the shared board files**

```bash
cd /home/vyns/Documents/github/Lumina
mkdir -p src/lib/loker/boards
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/boards/types.ts src/lib/loker/boards/
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/boards/url.ts src/lib/loker/boards/
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/boards/html.ts src/lib/loker/boards/
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/io.ts src/lib/loker/io.ts
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/jobstreet-audit.ts src/lib/loker/
```

`io.ts` lives one level above `boards/` because it imports `./boards/types`;
moving it inside `boards/` would break that path. The other files import only
each other through relative paths that survive the move (`./url`,
`../jobstreet-audit`). Do not rewrite them.

- [ ] **Step 2: Copy the helper tests and convert them from Vitest**

```bash
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/boards/types.test.ts src/lib/loker/boards/
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/boards/url.test.ts src/lib/loker/boards/
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/boards/html.test.ts src/lib/loker/boards/
sed -i '/from "vitest"/d' src/lib/loker/boards/*.test.ts
sed -i 's/\bvi\./jest./g' src/lib/loker/boards/*.test.ts
```

Jest injects `describe/it/expect/beforeEach` as globals, so removing the Vitest
import is the whole conversion. `vi.fn` becomes `jest.fn`.

- [ ] **Step 3: Run the helper tests**

Run: `npm test -- src/lib/loker/boards/types.test.ts src/lib/loker/boards/url.test.ts src/lib/loker/boards/html.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit (deferred)**

```bash
git add src/lib/loker/boards src/lib/loker/io.ts src/lib/loker/jobstreet-audit.ts
git commit -m "feat(loker): port the board contract, URL/HTML helpers, and I/O"
```

---

## Task 7: Port the six board adapters

**Files:**
- Create: `src/lib/loker/boards/{jobstreet,kalibrr,dealls,workable,smartrecruiters,breezy}.ts`
- Create: `src/lib/loker/boards/index.ts`
- Create: `src/lib/loker/boards/*.test.ts`
- Test: `src/lib/loker/boards/index.test.ts` and the six adapter tests

**Interfaces:**
- Consumes: `BahanAudit`, `Io`, `PapanAdapter` (Task 6)
- Produces: `ADAPTER: readonly PapanAdapter[]`
- Produces: `adapterUntuk(url): PapanAdapter | null`, `namaPapan(url): string | undefined` (ported with the registry)

- [ ] **Step 1: Copy the adapters and the registry**

```bash
cd /home/vyns/Documents/github/Lumina
for f in jobstreet kalibrr dealls workable smartrecruiters breezy index; do
  cp "/home/vyns/Documents/github/careevo/src/lib/career-ops/boards/$f.ts" src/lib/loker/boards/
done
```

No import rewrites: every adapter imports `./types`, `./url`, `./html`, or
`../jobstreet-audit`, and those paths now resolve inside `src/lib/loker/`.

- [ ] **Step 2: Copy the adapter tests and convert them from Vitest**

```bash
for f in jobstreet kalibrr dealls workable smartrecruiters breezy index; do
  cp "/home/vyns/Documents/github/careevo/src/lib/career-ops/boards/$f.test.ts" src/lib/loker/boards/
done
cp /home/vyns/Documents/github/careevo/src/lib/career-ops/jobstreet-audit.test.ts src/lib/loker/
sed -i '/from "vitest"/d' src/lib/loker/boards/*.test.ts src/lib/loker/jobstreet-audit.test.ts
sed -i 's/\bvi\./jest./g' src/lib/loker/boards/*.test.ts src/lib/loker/jobstreet-audit.test.ts
```

- [ ] **Step 3: Run all board tests**

Run: `npm test -- src/lib/loker/boards src/lib/loker/jobstreet-audit.test.ts`
Expected: PASS, including the registry uniqueness case in `index.test.ts` (each
sample URL is claimed by exactly one adapter).

- [ ] **Step 4: Commit (deferred)**

```bash
git add src/lib/loker/boards src/lib/loker/jobstreet-audit.test.ts
git commit -m "feat(loker): port the six detail adapters and the board registry"
```

---

## Task 8: Port the Sentinel audit and add `auditPosting`

**Files:**
- Create: `src/lib/loker/audit/fee-rules.ts` (verbatim port)
- Create: `src/lib/loker/audit/trust.ts` (verbatim port)
- Create: `src/lib/loker/audit/sentinel.ts` (port + wrapper)
- Test: `src/lib/loker/audit/sentinel.test.ts`, `src/lib/loker/audit/trust.test.ts`

**Interfaces:**
- Produces: `auditLoker(input: SentinelInput): SentinelOutput` (ported, unchanged)
- Produces: `auditPosting(input: SentinelInput): AuditPosting`
- `AuditPosting = { status: "clean" | "suspicious" | "rejected"; flags: string[]; feeFlags: string[]; trustFlags: string[]; trustScore: number; trustLevel: TrustLevel }`
- Produces: `labelSinyal(flag: string): string`

- [ ] **Step 1: Copy the two leaf files, create the shared status type, and copy the trust test**

```bash
cd /home/vyns/Documents/github/Lumina
mkdir -p src/lib/loker/audit
cp /home/vyns/Documents/github/careevo/src/lib/agents/rules/fee-rules.ts src/lib/loker/audit/fee-rules.ts
cp /home/vyns/Documents/github/careevo/src/lib/jobs/trust.ts src/lib/loker/audit/trust.ts
cp /home/vyns/Documents/github/careevo/src/lib/jobs/trust.test.ts src/lib/loker/audit/trust.test.ts
sed -i '/from "vitest"/d' src/lib/loker/audit/trust.test.ts
sed -i 's/\bvi\./jest./g' src/lib/loker/audit/trust.test.ts
sed -i 's#"@/lib/jobs/trust"#"@/lib/loker/audit/trust"#g' src/lib/loker/audit/trust.test.ts
```

Create `src/lib/loker/types.ts` (Task 10 extends this file):

```ts
/** The verdict vocabulary Lumina stores and displays. */
export type LokerSentinelStatus = "clean" | "suspicious" | "rejected";
```

`fee-rules.ts` and `trust.ts` import nothing, so only the test import changes.

- [ ] **Step 2: Copy the Sentinel source and rewrite its imports**

```bash
cp /home/vyns/Documents/github/careevo/src/lib/agents/sentinel.ts src/lib/loker/audit/sentinel.ts
```

Edit `src/lib/loker/audit/sentinel.ts`:

a. Replace the first line

```ts
import type { SentinelStatus } from "@/types/domain";
```

with

```ts
/** Careevo's internal vocabulary; `auditPosting` maps `quarantined` → `suspicious`. */
export type SentinelStatus = "clean" | "quarantined" | "rejected";
```

b. Replace `from "./rules/fee-rules"` with `from "./fee-rules"`.

c. Replace `from "@/lib/jobs/trust"` with `from "./trust"`.

- [ ] **Step 3: Append the public wrapper**

Append to `src/lib/loker/audit/sentinel.ts`:

```ts
import type { LokerSentinelStatus } from "@/lib/loker/types";

export interface AuditPosting {
  status: LokerSentinelStatus;
  flags: string[];
  feeFlags: string[];
  trustFlags: string[];
  trustScore: number;
  trustLevel: TrustLevel;
}

/**
 * Lumina's single entry point.
 *
 * The mapping from Careevo's `quarantined` to Lumina's `suspicious` happens
 * here and only here, so the ported rule code and its ported tests keep
 * Careevo's exact vocabulary.
 */
export function auditPosting(input: SentinelInput): AuditPosting {
  const result = auditLoker(input);
  return {
    status: result.status === "quarantined" ? "suspicious" : result.status,
    flags: result.flags,
    feeFlags: result.fee_flags,
    trustFlags: result.trust_flags,
    trustScore: result.trust_score,
    trustLevel: result.trust_level,
  };
}
```

- [ ] **Step 4: Copy the Sentinel test and remove the fixture dependency**

```bash
cp /home/vyns/Documents/github/careevo/src/lib/agents/sentinel.test.ts src/lib/loker/audit/sentinel.test.ts
sed -i '/from "vitest"/d' src/lib/loker/audit/sentinel.test.ts
sed -i 's/\bvi\./jest./g' src/lib/loker/audit/sentinel.test.ts
sed -i 's#"@/lib/agents/sentinel"#"@/lib/loker/audit/sentinel"#g' src/lib/loker/audit/sentinel.test.ts
sed -i 's#"@/lib/agents/rules/fee-rules"#"@/lib/loker/audit/fee-rules"#g' src/lib/loker/audit/sentinel.test.ts
sed -i '/import { jobs } from "@\/lib\/fixtures";/d' src/lib/loker/audit/sentinel.test.ts
```

Then replace the two tests that iterated `jobs` with these inline versions:

```ts
  it("never shows a learner a raw signal id for a real audit", () => {
    const result = auditLoker({
      ...DASAR,
      description: "Wajib unduh APK dan kirim KTP. Biaya administrasi.",
      apply_url: "https://bit.ly/xyz",
      company_email: "hr@gmail.com",
      domain_age_days: 3,
      employer_known: false,
    });
    for (const flag of result.flags) expect(labelSinyal(flag)).not.toBe(flag);
  });
```

```ts
  it("fee_flags is always a subset of flags", () => {
    const result = auditLoker({ ...DASAR, description: "Wajib unduh APK." });
    for (const flag of result.fee_flags) {
      expect(result.flags).toContain(flag);
    }
  });
```

- [ ] **Step 5: Add the wrapper test**

At the top of `src/lib/loker/audit/sentinel.test.ts`, extend the existing import:

```ts
import {
  auditLoker,
  auditPosting,
  labelSinyal,
} from "@/lib/loker/audit/sentinel";
```

Append at the end of the file:

```ts
describe("auditPosting", () => {
  it("maps Careevo's quarantined verdict to suspicious", () => {
    const out = auditPosting({ ...DASAR, company_email: "hr@gmail.com" });
    expect(out.status).toBe("suspicious");
  });

  it("keeps clean and rejected unchanged", () => {
    expect(auditPosting(DASAR).status).toBe("clean");
    expect(
      auditPosting({ ...DASAR, description: "Wajib unduh APK." }).status,
    ).toBe("rejected");
  });

  it("renames the output fields to camelCase without changing values", () => {
    const out = auditPosting({ ...DASAR, apply_url: "https://bit.ly/xyz" });
    expect(out.feeFlags).toEqual([]);
    expect(out.trustFlags).toContain("link_pendek");
    expect(out.trustScore).toBeLessThan(100);
  });
});
```

- [ ] **Step 6: Run the audit tests**

Run: `npm test -- src/lib/loker/audit`
Expected: PASS.

- [ ] **Step 7: Commit (deferred)**

```bash
git add src/lib/loker/audit
git commit -m "feat(loker): port the Sentinel audit and add the auditPosting wrapper"
```

---

## Task 9: Email extraction and RDAP domain age

**Files:**
- Create: `src/lib/loker/enrich.ts`
- Test: `src/lib/loker/enrich.test.ts`

**Interfaces:**
- Produces: `extractEmail(...texts: (string | null | undefined)[]): string | null`
- Produces: `registrableDomain(hostname: string): string`
- Produces: `lookupDomainAge(hostname: string, io: DomainIo, now?: number): Promise<DomainAge>`
- Types: `DomainAge = { status: "ok" | "unknown" | "error"; ageDays: number | null }`, `DomainIo = { fetchJson(url: string): Promise<unknown> }`

- [ ] **Step 1: Write the failing test**

`src/lib/loker/enrich.test.ts`:

```ts
/** @jest-environment node */
import {
  extractEmail,
  lookupDomainAge,
  registrableDomain,
} from "@/lib/loker/enrich";

describe("extractEmail", () => {
  it("returns the first address, lowercased", () => {
    expect(extractEmail("Hubungi HRD@Example.COM untuk melamar")).toBe(
      "hrd@example.com",
    );
  });

  it("falls back to later fields when the description has none", () => {
    expect(extractEmail(null, "", "PT Maju <rekrutmen@maju.co.id>")).toBe(
      "rekrutmen@maju.co.id",
    );
  });

  it("returns null when nothing looks like an address", () => {
    expect(extractEmail("Lamar lewat situs kami.")).toBeNull();
    expect(extractEmail()).toBeNull();
  });
});

describe("registrableDomain", () => {
  it("strips subdomains", () => {
    expect(registrableDomain("id.jobstreet.com")).toBe("jobstreet.com");
    expect(registrableDomain("careers.allianz.com")).toBe("allianz.com");
  });

  it("keeps two-part Indonesian TLDs", () => {
    expect(registrableDomain("karir.maju.co.id")).toBe("maju.co.id");
  });

  it("rejects hosts that cannot be looked up", () => {
    expect(registrableDomain("localhost")).toBe("");
    expect(registrableDomain("127.0.0.1")).toBe("");
    expect(registrableDomain("")).toBe("");
  });
});

describe("lookupDomainAge", () => {
  const now = Date.UTC(2026, 10, 9);
  const io = (result: unknown) => ({
    fetchJson: jest.fn().mockResolvedValue(result),
  });

  it("reads the registration event and returns whole days", async () => {
    const hundredDaysAgo = new Date(now - 100 * 86_400_000).toISOString();
    const out = await lookupDomainAge(
      "id.jobstreet.com",
      io({
        events: [
          { eventAction: "last changed", eventDate: new Date(now).toISOString() },
          { eventAction: "registration", eventDate: hundredDaysAgo },
        ],
      }),
      now,
    );
    expect(out).toEqual({ status: "ok", ageDays: 100 });
  });

  it("asks RDAP for the registrable domain, not the subdomain", async () => {
    const fake = io({ events: [] });
    await lookupDomainAge("karir.maju.co.id", fake, now);
    expect(fake.fetchJson).toHaveBeenCalledWith(
      "https://rdap.org/domain/maju.co.id",
    );
  });

  it("reports unknown when RDAP has no registration event", async () => {
    const out = await lookupDomainAge("maju.co.id", io({ events: [] }), now);
    expect(out).toEqual({ status: "unknown", ageDays: null });
  });

  it("reports error when the request fails", async () => {
    const failing = { fetchJson: jest.fn().mockRejectedValue(new Error("404")) };
    const out = await lookupDomainAge("maju.co.id", failing, now);
    expect(out).toEqual({ status: "error", ageDays: null });
  });

  it("does not call RDAP for an unusable host", async () => {
    const fake = io({ events: [] });
    const out = await lookupDomainAge("localhost", fake, now);
    expect(out).toEqual({ status: "unknown", ageDays: null });
    expect(fake.fetchJson).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/enrich.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/loker/enrich.ts`**

```ts
import "server-only";

/**
 * Enrichment the audit requires.
 *
 * `company_email` and `domain_age_days` are `not null` in the schema, so a row
 * that cannot fill them is dropped and counted — never inserted with a null
 * that would silently weaken the audit.
 */

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** First address found across the supplied texts, lowercased. */
export function extractEmail(
  ...texts: (string | null | undefined)[]
): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = EMAIL.exec(text);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

/**
 * Two-part TLDs that are registrable units. A full public-suffix list would be
 * a dependency; this covers the Indonesian and common regional suffixes the
 * boards in `scanner/portals.yml` actually use.
 */
const DUA_BAGIAN = new Set([
  "co.id", "ac.id", "or.id", "web.id", "go.id", "my.id", "biz.id", "sch.id",
  "co.uk", "org.uk", "ac.uk",
  "com.au", "net.au", "org.au",
  "co.nz", "com.sg", "com.my", "co.jp",
]);

/**
 * The domain RDAP should be asked about.
 *
 * Returns "" for hosts RDAP cannot answer for: a bare label ("localhost"), or
 * an IPv4/IPv6 literal.
 */
export function registrableDomain(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || !host.includes(".")) return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return "";
  if (host.includes(":")) return "";
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  if (DUA_BAGIAN.has(lastTwo)) return parts.slice(-3).join(".");
  return lastTwo;
}

export type DomainAgeStatus = "ok" | "unknown" | "error";

export interface DomainAge {
  status: DomainAgeStatus;
  ageDays: number | null;
}

export interface DomainIo {
  fetchJson(url: string): Promise<unknown>;
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

const RDAP = "https://rdap.org/domain/";

/**
 * Registration age in whole days.
 *
 * `unknown` means RDAP answered but named no registration event; `error` means
 * the request failed. Both are distinct from a real age, and the caller drops
 * the row rather than guess.
 */
export async function lookupDomainAge(
  hostname: string,
  io: DomainIo,
  now: number = Date.now(),
): Promise<DomainAge> {
  const domain = registrableDomain(hostname);
  if (!domain) return { status: "unknown", ageDays: null };

  let payload: unknown;
  try {
    payload = await io.fetchJson(`${RDAP}${encodeURIComponent(domain)}`);
  } catch {
    return { status: "error", ageDays: null };
  }

  const events = (payload as { events?: RdapEvent[] } | null)?.events;
  const registration = Array.isArray(events)
    ? events.find((event) => event.eventAction === "registration")
    : undefined;
  const registeredAt = registration?.eventDate
    ? Date.parse(registration.eventDate)
    : Number.NaN;
  if (!Number.isFinite(registeredAt)) {
    return { status: "unknown", ageDays: null };
  }

  const days = Math.floor((now - registeredAt) / 86_400_000);
  return { status: "ok", ageDays: Math.max(0, days) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/loker/enrich.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (deferred)**

```bash
git add src/lib/loker/enrich.ts src/lib/loker/enrich.test.ts
git commit -m "feat(loker): add email extraction and RDAP domain age"
```

---

## Task 10: Shared types and the client search pipeline

**Files:**
- Modify: `src/lib/loker/types.ts`
- Create: `src/lib/loker/search.ts`
- Test: `src/lib/loker/search.test.ts`

**Interfaces:**
- Consumes: `filters.ts` (Task 4), `query.ts` (Task 5), `JobSearchArgs` (Task 15 — define the type inline here until then; Task 15 re-exports it)
- Produces: `LokerView`, `LokerCorpus`, `ScanRunStatus`, `SavedLoker`
- Produces: `filterPostings(postings: readonly LokerView[], args: JobSearchArgs): LokerView[]`

- [ ] **Step 1: Extend `src/lib/loker/types.ts`**

```ts
import type { Risk } from "@/lib/contracts/score";

/**
 * `LokerSentinelStatus` is already declared in this file by Task 8. Do NOT
 * re-declare it here — duplicate exports fail typecheck.
 */

/** One posting as the server loads it and the client renders it. */
export interface LokerView {
  urlKey: string;
  title: string;
  company: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryText: string | null;
  tags: string[];
  description: string;
  applyUrl: string | null;
  source: string;
  postedAt: string | null;
  fetchedAt: string;
  companyEmail: string;
  domainAgeDays: number;
  employerKnown: boolean;
  sentinelStatus: LokerSentinelStatus;
  sentinelFlags: string[];
  trustScore: number;
  trustLevel: string;
  luminaScore: number;
  luminaRisk: Risk;
  luminaSignals: { label: string; weight: number }[];
}

/** What the RSC loader hands the client. */
export interface LokerCorpus {
  postings: LokerView[];
  total: number;
  capped: boolean;
}

export interface ScanRunStatus {
  status: "running" | "ok" | "failed";
  found: number;
  added: number;
  dropped: number;
  finishedAt: string | null;
}

/** The device-local snapshot written to `localStorage`. */
export interface SavedLoker {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salaryText: string | null;
  sentinelStatus: LokerSentinelStatus;
  luminaRisk: Risk;
  savedAt: string;
}

/** The subset of `JobSearchArgs` the filter needs; Task 15 declares the schema. */
export interface LokerSearchArgs {
  query: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  hideFlagged?: boolean;
}
```

- [ ] **Step 2: Write the failing test**

`src/lib/loker/search.test.ts`:

```ts
import { filterPostings } from "@/lib/loker/search";
import type { LokerView } from "@/lib/loker/types";

function posting(over: Partial<LokerView> = {}): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: 10_000_000,
    salaryMax: 15_000_000,
    salaryText: "Rp10-15 jt",
    tags: ["React"],
    description: "Membangun antarmuka React.",
    applyUrl: "https://example.com/1",
    source: "Jobstreet",
    postedAt: "2026-11-01",
    fetchedAt: "2026-11-09T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
    ...over,
  };
}

describe("filterPostings", () => {
  it("requires every query term (AND, not OR)", () => {
    const rows = [
      posting(),
      posting({ urlKey: "2", title: "Backend Engineer", description: "Go." }),
    ];
    expect(
      filterPostings(rows, { query: "React Jakarta" }).map((r) => r.urlKey),
    ).toEqual(["https://example.com/1"]);
  });

  it("matches location from the location field, not the prose", () => {
    const rows = [
      posting(),
      posting({ urlKey: "2", location: "Bandung" }),
    ];
    expect(
      filterPostings(rows, { query: "engineer", location: "Jakarta" }),
    ).toHaveLength(1);
  });

  it("passes postings with no salary when a band is requested", () => {
    const rows = [posting({ salaryMin: null, salaryMax: null, salaryText: null })];
    expect(
      filterPostings(rows, { query: "engineer", salaryMin: 8_000_000 }),
    ).toHaveLength(1);
  });

  it("drops a posting entirely below the requested band", () => {
    const rows = [posting({ salaryMin: 3_000_000, salaryMax: 5_000_000 })];
    expect(
      filterPostings(rows, { query: "engineer", salaryMin: 8_000_000 }),
    ).toHaveLength(0);
  });

  it("hideFlagged drops either verdict's caution", () => {
    const rows = [
      posting(),
      posting({ urlKey: "2", sentinelStatus: "suspicious" }),
      posting({ urlKey: "3", luminaRisk: "mencurigakan" }),
    ];
    expect(
      filterPostings(rows, { query: "", hideFlagged: true }).map((r) => r.urlKey),
    ).toEqual(["https://example.com/1"]);
  });

  it("an empty query keeps the corpus order", () => {
    const rows = [posting({ urlKey: "a" }), posting({ urlKey: "b" })];
    expect(filterPostings(rows, { query: "" }).map((r) => r.urlKey)).toEqual([
      "a",
      "b",
    ]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/loker/search.ts`**

```ts
import {
  buatFilterGaji,
  buatFilterKonten,
  buatFilterLokasi,
} from "@/lib/loker/filters";
import { teksLoker, uraiKueri } from "@/lib/loker/query";
import type { LokerSearchArgs, LokerView } from "@/lib/loker/types";

/**
 * The client-side search pipeline.
 *
 * The user's query is filtered here, in the browser, against the RSC snapshot.
 * There is no search endpoint, which is what makes "the query never leaves the
 * device" structural rather than a promise.
 *
 * Order matches the spec: query terms (AND) → location → salary → hide-flagged.
 */
export function filterPostings(
  postings: readonly LokerView[],
  args: LokerSearchArgs,
): LokerView[] {
  const terms = uraiKueri(args.query);
  const cocokLokasi = buatFilterLokasi(
    args.location ? { allow: [args.location] } : null,
  );
  const cocokGaji = buatFilterGaji(
    args.salaryMin !== undefined || args.salaryMax !== undefined
      ? { min: args.salaryMin, max: args.salaryMax }
      : null,
  );

  return postings.filter((posting) => {
    if (terms.length > 0) {
      const text = teksLoker({
        title: posting.title,
        description: posting.description,
        location: posting.location ?? "",
        tags: posting.tags,
      });
      // One `buatFilterKonten` call per term: the ported filter ORs its
      // positive list, and the chat box needs AND.
      for (const term of terms) {
        if (!buatFilterKonten({ positive: [term] })(text)) return false;
      }
    }

    if (!cocokLokasi(posting.location)) return false;

    const salary =
      posting.salaryMin === null && posting.salaryMax === null
        ? null
        : {
            min: posting.salaryMin,
            max: posting.salaryMax,
            currency: "IDR",
          };
    if (!cocokGaji(salary)) return false;

    if (args.hideFlagged) {
      if (posting.sentinelStatus !== "clean") return false;
      if (
        posting.luminaRisk === "mencurigakan" ||
        posting.luminaRisk === "tinggi"
      ) {
        return false;
      }
    }

    return true;
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/lib/loker/search.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit (deferred)**

```bash
git add src/lib/loker/types.ts src/lib/loker/search.ts src/lib/loker/search.test.ts
git commit -m "feat(loker): add shared view types and the client filter pipeline"
```

---

## Task 11: Migration and the Postgres store

**Files:**
- Create: `migrations/002_loker.sql`
- Create: `src/lib/loker/store.ts`
- Test: `src/lib/loker/store.test.ts` (integration, skipped without `TEST_DATABASE_URL`)

**Interfaces:**
- Consumes: `LokerView`, `ScanRunStatus`, `LokerSentinelStatus` (Task 10)
- Produces: `upsertPosting(row: PostingRow): Promise<void>`
- Produces: `loadCorpus(limit?: number): Promise<{ postings: LokerView[]; total: number }>`
- Produces: `startScanRun(triggeredBy: string | null): Promise<number>`
- Produces: `finishScanRun(id, result): Promise<void>`
- Produces: `latestScanRun(): Promise<ScanRunStatus | null>`
- Produces: `readDomainCache(domain): Promise<DomainCacheEntry | null>`
- Produces: `writeDomainCache(domain, ageDays, status): Promise<void>`

- [ ] **Step 1: Write the migration**

`migrations/002_loker.sql`:

```sql
create table loker_scan_runs (
  id              bigserial primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running', -- running | ok | failed
  found           int  not null default 0,
  added           int  not null default 0,
  dropped         int  not null default 0,
  provider_errors jsonb not null default '[]',
  exit_code       int,
  triggered_by    text
);

create table loker_postings (
  url_key          text primary key,
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
  sentinel_status  text not null,
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
  status     text not null, -- ok | unknown | error
  checked_at timestamptz not null default now()
);

create index loker_postings_posted_at_idx on loker_postings (posted_at desc nulls last);
create index loker_postings_sentinel_idx  on loker_postings (sentinel_status);
create index loker_postings_tags_idx      on loker_postings using gin (tags);
```

- [ ] **Step 2: Write the failing integration test**

`src/lib/loker/store.test.ts`:

```ts
/** @jest-environment node */
jest.mock("server-only", () => ({}), { virtual: true });

import { readFile } from "node:fs/promises";
import path from "node:path";
import { authDatabase } from "@/lib/auth/database";
import { testDatabaseUrl } from "@/lib/auth/test-database";
import {
  finishScanRun,
  latestScanRun,
  loadCorpus,
  readDomainCache,
  startScanRun,
  upsertPosting,
  writeDomainCache,
  type PostingRow,
} from "@/lib/loker/store";

const testUrl = testDatabaseUrl();
if (testUrl) process.env.DATABASE_URL = testUrl;
const integration = testUrl ? describe : describe.skip;

function row(over: Partial<PostingRow> = {}): PostingRow {
  return {
    urlKey: "https://id.jobstreet.com/job/1",
    runId: null,
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: 10_000_000,
    salaryMax: 15_000_000,
    salaryCurrency: "IDR",
    tags: ["React"],
    description: "Membangun antarmuka.",
    applyUrl: "https://id.jobstreet.com/job/1",
    source: "Jobstreet",
    postedAt: "2026-11-01",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
    ...over,
  };
}

integration("loker store", () => {
  beforeAll(async () => {
    await authDatabase().query(
      "drop table if exists loker_postings, loker_scan_runs, loker_domain_cache cascade",
    );
    const sql = await readFile(
      path.join(process.cwd(), "migrations", "002_loker.sql"),
      "utf8",
    );
    await authDatabase().query(sql);
  });

  beforeEach(async () => {
    await authDatabase().query(
      "truncate loker_postings, loker_scan_runs, loker_domain_cache restart identity cascade",
    );
  });

  afterAll(async () => {
    await authDatabase().end();
  });

  it("upserts by url_key and never duplicates a posting", async () => {
    await upsertPosting(row());
    await upsertPosting(row({ title: "Senior Frontend Engineer" }));
    const { postings, total } = await loadCorpus();
    expect(total).toBe(1);
    expect(postings[0]?.title).toBe("Senior Frontend Engineer");
  });

  it("returns the corpus newest first with a real total", async () => {
    await upsertPosting(row({ urlKey: "a", title: "A" }));
    await authDatabase().query(
      "update loker_postings set fetched_at = now() - interval '1 day' where url_key = 'a'",
    );
    await upsertPosting(row({ urlKey: "b", title: "B" }));
    const { postings, total } = await loadCorpus(10);
    expect(total).toBe(2);
    expect(postings.map((p) => p.urlKey)).toEqual(["b", "a"]);
  });

  it("caps the returned rows but reports the full total", async () => {
    for (const key of ["a", "b", "c"]) {
      await upsertPosting(row({ urlKey: key }));
    }
    const { postings, total } = await loadCorpus(2);
    expect(postings).toHaveLength(2);
    expect(total).toBe(3);
  });

  it("records a run from running to finished", async () => {
    const runId = await startScanRun("test@example.com");
    expect(await latestScanRun()).toMatchObject({ status: "running", found: 0 });
    await finishScanRun(runId, {
      status: "ok",
      found: 40,
      added: 26,
      dropped: 14,
      exitCode: 2,
      providerErrors: [{ company: "Glints", error: "403" }],
    });
    expect(await latestScanRun()).toMatchObject({
      status: "ok",
      found: 40,
      added: 26,
      dropped: 14,
    });
  });

  it("stores and reads a domain cache entry", async () => {
    await writeDomainCache("maju.co.id", 400, "ok");
    expect(await readDomainCache("maju.co.id")).toMatchObject({
      ageDays: 400,
      status: "ok",
    });
    expect(await readDomainCache("absent.co.id")).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/store.test.ts`
Expected: FAIL — module not found (or skipped when `TEST_DATABASE_URL` is unset;
run with the variable to see the failure).

- [ ] **Step 4: Implement `src/lib/loker/store.ts`**

```ts
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
  "url_key", "run_id", "title", "company", "location", "salary_min",
  "salary_max", "salary_currency", "tags", "description", "apply_url",
  "source", "posted_at", "company_email", "domain_age_days", "employer_known",
  "sentinel_status", "sentinel_flags", "trust_score", "trust_level",
  "lumina_score", "lumina_risk", "lumina_signals",
] as const;

/**
 * Insert or refresh one posting.
 *
 * The conflict target is `url_key`, the engine's own dedupe key, so a re-scan
 * refreshes audit data and `fetched_at` without ever creating a duplicate.
 */
export async function upsertPosting(row: PostingRow): Promise<void> {
  const values = [
    row.urlKey, row.runId, row.title, row.company, row.location,
    row.salaryMin, row.salaryMax, row.salaryCurrency, row.tags,
    row.description, row.applyUrl, row.source, row.postedAt,
    row.companyEmail, row.domainAgeDays, row.employerKnown,
    row.sentinelStatus, row.sentinelFlags, row.trustScore, row.trustLevel,
    row.luminaScore, row.luminaRisk, JSON.stringify(row.luminaSignals),
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

export async function startScanRun(triggeredBy: string | null): Promise<number> {
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
```

- [ ] **Step 5: Run the integration test**

Run: `TEST_DATABASE_URL=postgres://... npm test -- src/lib/loker/store.test.ts`
Expected: PASS. Without `TEST_DATABASE_URL` the suite reports skipped.

- [ ] **Step 6: Commit (deferred)**

```bash
git add migrations/002_loker.sql src/lib/loker/store.ts src/lib/loker/store.test.ts
git commit -m "feat(loker): add the postings schema and Postgres store"
```

---

## Task 12: The ingest pipeline

**Files:**
- Create: `src/lib/loker/ingest.ts`
- Test: `src/lib/loker/ingest.test.ts`

**Interfaces:**
- Consumes: `InboxJobShape` (Task 2), `BahanAudit` (Task 6), `auditPosting`/`AuditPosting` (Task 8), `DomainAge` (Task 9), `PostingRow` (Task 11), `parseRentangGaji` (Task 4), `normalisasiKunciUrl` (Task 2)
- Produces: `ingestScan(rows, runId, deps): Promise<{ added: number; dropped: number }>`
- Produces: `IngestDeps` (injected in tests and by `run.ts`)

- [ ] **Step 1: Write the failing test**

`src/lib/loker/ingest.test.ts`:

```ts
/** @jest-environment node */
import { ingestScan, type IngestDeps } from "@/lib/loker/ingest";
import type { InboxJobShape } from "@/lib/loker/pipeline-table";
import type { PostingRow } from "@/lib/loker/store";

const row = (over: Partial<InboxJobShape> = {}): InboxJobShape => ({
  url: "https://id.jobstreet.com/job/1",
  company: "PT Maju",
  role: "Frontend Engineer",
  location: "Jakarta",
  compensation: "Rp10-15 jt",
  done: false,
  ...over,
});

function deps(over: Partial<IngestDeps> = {}): IngestDeps {
  const saved: PostingRow[] = [];
  const base: IngestDeps = {
    detail: jest.fn().mockResolvedValue({
      bahan: {
        description: "Membangun antarmuka React. Lamar ke hr@maju.co.id.",
        apply_url: "https://id.jobstreet.com/job/1",
        company: "PT Maju",
        employer_known: true,
      },
      tags: ["React"],
      source: "Jobstreet",
    }),
    email: jest.fn().mockReturnValue("hr@maju.co.id"),
    domainAge: jest.fn().mockResolvedValue({ status: "ok", ageDays: 400 }),
    audit: jest.fn().mockReturnValue({
      status: "clean",
      flags: [],
      feeFlags: [],
      trustFlags: [],
      trustScore: 100,
      trustLevel: "high",
    }),
    score: jest.fn().mockReturnValue({
      score: 0,
      risk: "bersih",
      signals: [
        { label: "Tidak ada pola penipuan", weight: 0, evidence: "x", agent: "message" },
      ],
      modus: "unrecognized",
      advice: [],
      relatedModule: null,
      hardOverride: false,
    }),
    save: jest.fn(async (r: PostingRow) => {
      saved.push(r);
    }),
    ...over,
  };
  return Object.assign(base, { saved });
}

describe("ingestScan", () => {
  it("saves one complete row and reports the honest counts", async () => {
    const d = deps();
    const out = await ingestScan(
      [
        row(),
        row({ url: "N/A" }),
        row({ url: "https://id.jobstreet.com/job/2" }),
      ],
      7,
      {
        ...d,
        detail: jest
          .fn()
          .mockResolvedValueOnce({
            bahan: {
              description: "React. hr@maju.co.id",
              apply_url: "https://id.jobstreet.com/job/1",
              company: "PT Maju",
              employer_known: true,
            },
            tags: ["React"],
            source: "Jobstreet",
          })
          .mockResolvedValueOnce(null),
      },
    );
    expect(out).toEqual({ added: 1, dropped: 2 });
    const saved = (d as IngestDeps & { saved: PostingRow[] }).saved;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      urlKey: "https://id.jobstreet.com/job/1",
      runId: 7,
      title: "Frontend Engineer",
      company: "PT Maju",
      salaryMin: 10_000_000,
      salaryMax: 15_000_000,
      salaryCurrency: "IDR",
      companyEmail: "hr@maju.co.id",
      domainAgeDays: 400,
      employerKnown: true,
      sentinelStatus: "clean",
      luminaRisk: "bersih",
      tags: ["React"],
      source: "Jobstreet",
      postedAt: null,
    });
  });

  it("persists only label and weight, never the evidence quote", async () => {
    const d = deps({
      score: jest.fn().mockReturnValue({
        score: 70,
        risk: "tinggi",
        signals: [
          { label: "Meminta OTP", weight: 0.9, evidence: "kirim OTP kamu", agent: "message" },
        ],
        modus: "otp",
        advice: [],
        relatedModule: null,
        hardOverride: false,
      }),
    });
    await ingestScan([row()], 1, d);
    const saved = (d as IngestDeps & { saved: PostingRow[] }).saved;
    expect(saved[0]?.luminaSignals).toEqual([{ label: "Meminta OTP", weight: 0.9 }]);
    expect(JSON.stringify(saved[0])).not.toContain("kirim OTP kamu");
  });

  it("drops a row whose domain age could not be resolved", async () => {
    const out = await ingestScan(
      [row()],
      1,
      deps({ domainAge: jest.fn().mockResolvedValue({ status: "error", ageDays: null }) }),
    );
    expect(out).toEqual({ added: 0, dropped: 1 });
  });

  it("drops a row with no company email rather than inserting null", async () => {
    const out = await ingestScan(
      [row()],
      1,
      deps({ email: jest.fn().mockReturnValue(null) }),
    );
    expect(out).toEqual({ added: 0, dropped: 1 });
  });

  it("caps the stored description", async () => {
    const d = deps({
      detail: jest.fn().mockResolvedValue({
        bahan: {
          description: "x".repeat(9000),
          apply_url: "https://id.jobstreet.com/job/1",
          company: "PT Maju",
          employer_known: true,
        },
        tags: [],
        source: "Jobstreet",
      }),
    });
    await ingestScan([row()], 1, d);
    const saved = (d as IngestDeps & { saved: PostingRow[] }).saved;
    expect(saved[0]?.description).toHaveLength(4000);
  });

  it("treats an adapter throw as a dropped row, not a failed run", async () => {
    const out = await ingestScan(
      [row()],
      1,
      deps({ detail: jest.fn().mockRejectedValue(new Error("boom")) }),
    );
    expect(out).toEqual({ added: 0, dropped: 1 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/ingest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/loker/ingest.ts`**

```ts
import "server-only";
import type { ScoreResult } from "@/lib/contracts/score";
import type { AuditPosting } from "@/lib/loker/audit/sentinel";
import type { SentinelInput } from "@/lib/loker/audit/sentinel";
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
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index] as T);
    }
  });
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/loker/ingest.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit (deferred)**

```bash
git add src/lib/loker/ingest.ts src/lib/loker/ingest.test.ts
git commit -m "feat(loker): add the audited ingest pipeline"
```

---

## Task 13: The scan run lifecycle

**Files:**
- Create: `src/lib/loker/run.ts`
- Test: `src/lib/loker/run.test.ts`

**Interfaces:**
- Consumes: `runScan` (Task 3), `parseInbox`/`normalisasiKunciUrl` (Task 2), `ingestScan`/`IngestDeps` (Task 12), `finishScanRun`/`readDomainCache`/`writeDomainCache`/`upsertPosting` (Task 11), `adapterUntuk`/`namaPapan` (Task 7), `ioDefault` (Task 6), `auditPosting` (Task 8), `extractEmail`/`lookupDomainAge`/`registrableDomain` (Task 9), `scoreText` (existing), `scanDataDir` (Task 1)
- Produces: `runScanJob(runId: number, deps?: RunDeps): Promise<void>`
- Produces: `realIngestDeps(): IngestDeps`

- [ ] **Step 1: Write the failing test**

`src/lib/loker/run.test.ts`:

```ts
/** @jest-environment node */
import { runScanJob, type RunDeps } from "@/lib/loker/run";
import type { ScanOutcome } from "@/lib/loker/receipt";

const RECEIPT: ScanOutcome = {
  ok: true,
  exitCode: 2,
  receipt: {
    version: "careerops.scan.receipt@1",
    date: "2026-11-09",
    scanned: 36,
    skipped: 0,
    found: 40,
    filtered: 10,
    duplicates: 4,
    added: 2,
    added_urls: [
      "https://id.jobstreet.com/job/1",
      "https://id.jobstreet.com/job/2?utm_source=x",
    ],
    errors: [{ company: "Glints", error: "403" }],
    unverified_zero: [],
    dry_run: false,
  },
};

const PIPELINE = `# Pipeline

## Pending

- [ ] https://id.jobstreet.com/job/1 | PT Maju | Frontend Engineer | Jakarta | Rp10-15 jt | posted: 2026-11-01
- [ ] https://id.jobstreet.com/job/2 | PT Dua | Backend Engineer | Bandung | posted: 2026-11-02
- [ ] https://id.jobstreet.com/job/3 | PT Tiga | Data Engineer | Jakarta | posted: 2026-11-03
`;

function deps(over: Partial<RunDeps> = {}) {
  return {
    scan: jest.fn().mockResolvedValue(RECEIPT),
    readPipeline: jest.fn().mockResolvedValue(PIPELINE),
    ingest: jest.fn().mockResolvedValue({ added: 2, dropped: 0 }),
    finish: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe("runScanJob", () => {
  it("ingests only the rows this run added, then records an ok run", async () => {
    const d = deps();
    await runScanJob(9, d);

    const rows = (d.ingest.mock.calls[0] as unknown[])[0] as { url: string }[];
    expect(rows.map((r) => r.url)).toEqual([
      "https://id.jobstreet.com/job/1",
      "https://id.jobstreet.com/job/2?utm_source=x",
    ]);
    expect(d.finish).toHaveBeenCalledWith(9, {
      status: "ok",
      found: 40,
      added: 2,
      dropped: 0,
      exitCode: 2,
      providerErrors: [{ company: "Glints", error: "403" }],
    });
  });

  it("records a failed run when the scanner is fatal", async () => {
    const d = deps({
      scan: jest
        .fn()
        .mockResolvedValue({ ok: false, reason: "fatal", exitCode: 1 }),
    });
    await runScanJob(9, d);
    expect(d.ingest).not.toHaveBeenCalled();
    expect(d.finish).toHaveBeenCalledWith(9, {
      status: "failed",
      found: 0,
      added: 0,
      dropped: 0,
      exitCode: 1,
      providerErrors: [],
    });
  });

  it("records a failed run when ingest throws unexpectedly", async () => {
    const d = deps({
      ingest: jest.fn().mockRejectedValue(new Error("db down")),
    });
    await runScanJob(9, d);
    expect(d.finish).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("treats a missing pipeline file as zero rows, not a crash", async () => {
    const d = deps({ readPipeline: jest.fn().mockRejectedValue(new Error("ENOENT")) });
    await runScanJob(9, d);
    expect(d.ingest).toHaveBeenCalledWith([], 9, expect.anything());
    expect(d.finish).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ status: "ok", added: 2 }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/run.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/loker/run.ts`**

```ts
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { auditPosting } from "@/lib/loker/audit/sentinel";
import { scanDataDir } from "@/lib/loker/bootstrap";
import { adapterUntuk, namaPapan } from "@/lib/loker/boards";
import {
  extractEmail,
  lookupDomainAge,
  registrableDomain,
  type DomainAge,
} from "@/lib/loker/enrich";
import { ingestScan, type IngestDeps } from "@/lib/loker/ingest";
import { ioDefault } from "@/lib/loker/io";
import { normalisasiKunciUrl, parseInbox } from "@/lib/loker/receipt";
import { runScan } from "@/lib/loker/scan";
import {
  finishScanRun,
  readDomainCache,
  upsertPosting,
  writeDomainCache,
} from "@/lib/loker/store";
import { hostDari } from "@/lib/loker/boards/url";
import { scoreText } from "@/lib/scoring/score";

const CACHE_TTL_MS = 30 * 86_400_000;

/**
 * Domain age, cached in Postgres.
 *
 * RDAP is the only network call enrichment makes besides the board detail
 * fetch. The cache is keyed by registrable domain, so 12 Jobstreet postings on
 * one host cost one lookup.
 */
async function cachedDomainAge(url: string): Promise<DomainAge> {
  const domain = registrableDomain(hostDari(url));
  if (!domain) return { status: "unknown", ageDays: null };

  const cached = await readDomainCache(domain);
  if (cached && cached.status !== "error") {
    const fresh = Date.now() - Date.parse(cached.checkedAt) < CACHE_TTL_MS;
    if (fresh) return { status: cached.status, ageDays: cached.ageDays };
  }

  const next = await lookupDomainAge(domain, ioDefault);
  await writeDomainCache(domain, next.ageDays, next.status);
  return next;
}

/** The production dependency set. Tests build their own. */
export function realIngestDeps(): IngestDeps {
  return {
    async detail(url, company) {
      const adapter = adapterUntuk(url);
      if (!adapter) return null;
      const hasil = await adapter.ambilDetail(url, ioDefault, {
        perusahaan: company,
      });
      if (!hasil) return null;
      return {
        bahan: hasil.bahan,
        tags: hasil.tags ?? [],
        source: namaPapan(url) ?? adapter.nama,
      };
    },
    email: extractEmail,
    domainAge: cachedDomainAge,
    audit: auditPosting,
    score: (text) => scoreText({ text }),
    save: upsertPosting,
  };
}

export interface RunDeps {
  scan?: typeof runScan;
  readPipeline?: (root: string) => Promise<string>;
  ingest?: typeof ingestScan;
  finish?: typeof finishScanRun;
}

async function defaultReadPipeline(root: string): Promise<string> {
  return readFile(path.join(root, "data", "pipeline.md"), "utf8");
}

/**
 * One scan run, from the child process to the run row.
 *
 * Never throws: every failure becomes a `failed` run row, because the UI polls
 * that row and a silent rejection would leave it `running` forever.
 */
export async function runScanJob(
  runId: number,
  deps: RunDeps = {},
): Promise<void> {
  const scan = deps.scan ?? runScan;
  const readPipeline = deps.readPipeline ?? defaultReadPipeline;
  const ingest = deps.ingest ?? ingestScan;
  const finish = deps.finish ?? finishScanRun;

  try {
    const outcome = await scan({ since: 30 });
    if (!outcome.ok) {
      await finish(runId, {
        status: "failed",
        found: 0,
        added: 0,
        dropped: 0,
        exitCode: outcome.exitCode,
        providerErrors: [],
      });
      return;
    }

    const root = scanDataDir();
    let markdown = "";
    try {
      markdown = await readPipeline(root);
    } catch {
      markdown = "";
    }

    // Only this run's rows: `pipeline.md` is cumulative, and re-enriching the
    // whole history on every refresh would hammer the boards for nothing.
    const wanted = new Set(
      outcome.receipt.added_urls
        .map((url) => normalisasiKunciUrl(url))
        .filter(Boolean),
    );
    const rows = parseInbox(markdown).filter((row) =>
      wanted.has(normalisasiKunciUrl(row.url)),
    );

    const { added, dropped } = await ingest(rows, runId, realIngestDeps());

    await finish(runId, {
      status: "ok",
      found: outcome.receipt.found,
      added,
      dropped,
      exitCode: outcome.exitCode,
      providerErrors: outcome.receipt.errors,
    });
  } catch {
    await finish(runId, {
      status: "failed",
      found: 0,
      added: 0,
      dropped: 0,
      exitCode: null,
      providerErrors: [],
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/loker/run.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit (deferred)**

```bash
git add src/lib/loker/run.ts src/lib/loker/run.test.ts
git commit -m "feat(loker): wire the scan run lifecycle"
```

---

## Task 14: Scan routes and the browser scan client

**Files:**
- Create: `src/app/api/loker/scan/route.ts`
- Create: `src/app/api/loker/scan/status/route.ts`
- Create: `src/lib/loker/scan-client.ts`
- Test: `src/app/api/loker/scan/route.test.ts`, `src/app/api/loker/scan/status/route.test.ts`, `src/lib/loker/scan-client.test.ts`

**Interfaces:**
- Consumes: `getSession` (existing), `consumeAttempt`/`AuthError` (existing), `authDatabase` (existing), `clientKey` (existing), `startScanRun`/`latestScanRun` (Task 11), `runScanJob` (Task 13)
- Produces: `POST /api/loker/scan` → `202 {ok:true, runId}` | `401` | `409 scan-running` | `429` | `503`
- Produces: `GET /api/loker/scan/status` → `200 ScanRunStatus` | `204` (no run yet)
- Produces: `triggerScan(fetchImpl?): Promise<"started" | "running" | "unauthorized" | "failed">`
- Produces: `pollScan(onTick, options?): Promise<ScanRunStatus | null>`

- [ ] **Step 1: Write the failing client test**

`src/lib/loker/scan-client.test.ts`:

```ts
import { pollScan, triggerScan } from "@/lib/loker/scan-client";

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("triggerScan", () => {
  it("maps 202 to started and 409 to running", async () => {
    expect(
      await triggerScan(jest.fn().mockResolvedValue(response(202))),
    ).toBe("started");
    expect(
      await triggerScan(jest.fn().mockResolvedValue(response(409))),
    ).toBe("running");
  });

  it("maps 401 to unauthorized and a network failure to failed", async () => {
    expect(
      await triggerScan(jest.fn().mockResolvedValue(response(401))),
    ).toBe("unauthorized");
    expect(
      await triggerScan(jest.fn().mockRejectedValue(new Error("offline"))),
    ).toBe("failed");
  });
});

describe("pollScan", () => {
  it("returns the first settled status", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(response(200, { status: "running", found: 0, added: 0, dropped: 0, finishedAt: null }))
      .mockResolvedValueOnce(response(200, { status: "ok", found: 40, added: 26, dropped: 14, finishedAt: "2026-11-09T00:00:00.000Z" }));
    const seen: string[] = [];
    const out = await pollScan((s) => seen.push(s.status), {
      fetchImpl,
      intervalMs: 0,
    });
    expect(out?.status).toBe("ok");
    expect(seen).toEqual(["running", "ok"]);
  });

  it("returns null when no run exists yet", async () => {
    const out = await pollScan(jest.fn(), {
      fetchImpl: jest.fn().mockResolvedValue(response(204)),
    });
    expect(out).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `src/lib/loker/scan-client.ts`**

```ts
import type { ScanRunStatus } from "@/lib/loker/types";

export type TriggerResult =
  | "started"
  | "running"
  | "unauthorized"
  | "failed";

/** Ask the server to start a scan. Never throws. */
export async function triggerScan(
  fetchImpl: typeof fetch = fetch,
): Promise<TriggerResult> {
  try {
    const response = await fetchImpl("/api/loker/scan", { method: "POST" });
    if (response.status === 202) return "started";
    if (response.status === 409) return "running";
    if (response.status === 401 || response.status === 403) {
      return "unauthorized";
    }
    return "failed";
  } catch {
    return "failed";
  }
}

export interface PollOptions {
  fetchImpl?: typeof fetch;
  intervalMs?: number;
  maxTicks?: number;
}

/**
 * Poll the latest run until it settles.
 *
 * A 204 means no run has ever been recorded; that is a valid empty state, not
 * an error, so it returns null rather than throwing.
 */
export async function pollScan(
  onTick: (status: ScanRunStatus) => void,
  options: PollOptions = {},
): Promise<ScanRunStatus | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const intervalMs = options.intervalMs ?? 3_000;
  const maxTicks = options.maxTicks ?? 100;

  for (let tick = 0; tick < maxTicks; tick += 1) {
    let response: Response;
    try {
      response = await fetchImpl("/api/loker/scan/status", {
        cache: "no-store",
      });
    } catch {
      return null;
    }
    if (response.status === 204) return null;
    if (!response.ok) return null;

    const status = (await response.json()) as ScanRunStatus;
    onTick(status);
    if (status.status !== "running") return status;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
```

- [ ] **Step 3: Run the client test**

Run: `npm test -- src/lib/loker/scan-client.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing route test**

`src/app/api/loker/scan/route.test.ts`:

```ts
/** @jest-environment node */
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn(),
  AuthError: class AuthError extends Error {},
}));
jest.mock("@/lib/auth/database", () => ({ authDatabase: jest.fn() }));
jest.mock("@/lib/loker/run", () => ({ runScanJob: jest.fn() }));
jest.mock("@/lib/loker/store", () => ({
  startScanRun: jest.fn(),
  latestScanRun: jest.fn(),
}));
jest.mock("next/server", () => ({
  after: (cb: () => Promise<void>) => {
    (globalThis as { __after?: () => Promise<void> }).__after = cb;
  },
  connection: jest.fn(),
}));

import { authDatabase } from "@/lib/auth/database";
import { consumeAttempt } from "@/lib/auth/accounts";
import { getSession } from "@/lib/auth/server-session";
import { runScanJob } from "@/lib/loker/run";
import { startScanRun } from "@/lib/loker/store";
import { POST } from "@/app/api/loker/scan/route";

const session = { nama: "Rina", email: "rina@example.com" } as never;

function client(lock: boolean) {
  return {
    query: jest.fn().mockResolvedValue({ rows: [{ ok: lock }] }),
    release: jest.fn(),
  };
}

function request(): Request {
  return new Request("http://localhost/api/loker/scan", { method: "POST" });
}

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as { __after?: () => Promise<void> }).__after = undefined;
  jest.mocked(consumeAttempt).mockResolvedValue(undefined);
});

describe("POST /api/loker/scan", () => {
  it("requires a session", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(authDatabase).not.toHaveBeenCalled();
  });

  it("returns 409 when another scan holds the advisory lock", async () => {
    jest.mocked(getSession).mockResolvedValue(session);
    const fake = client(false);
    jest.mocked(authDatabase).mockReturnValue({ connect: jest.fn().mockResolvedValue(fake) } as never);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(fake.release).toHaveBeenCalled();
    expect(startScanRun).not.toHaveBeenCalled();
  });

  it("starts a run and releases the lock in the background", async () => {
    jest.mocked(getSession).mockResolvedValue(session);
    const fake = client(true);
    jest.mocked(authDatabase).mockReturnValue({ connect: jest.fn().mockResolvedValue(fake) } as never);
    jest.mocked(startScanRun).mockResolvedValue(42);
    jest.mocked(runScanJob).mockResolvedValue(undefined);

    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, runId: 42 });

    await (globalThis as { __after?: () => Promise<void> }).__after?.();
    expect(runScanJob).toHaveBeenCalledWith(42);
    expect(fake.query).toHaveBeenCalledWith(
      "select pg_advisory_unlock(hashtext('loker_scan'))",
    );
    expect(fake.release).toHaveBeenCalled();
  });
});
```

`src/app/api/loker/scan/status/route.test.ts`:

```ts
/** @jest-environment node */
jest.mock("next/server", () => ({ connection: jest.fn() }));
jest.mock("@/lib/loker/store", () => ({ latestScanRun: jest.fn() }));

import { latestScanRun } from "@/lib/loker/store";
import { GET } from "@/app/api/loker/scan/status/route";

describe("GET /api/loker/scan/status", () => {
  it("returns 204 before any run exists", async () => {
    jest.mocked(latestScanRun).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(204);
  });

  it("returns the latest run with no-store", async () => {
    jest.mocked(latestScanRun).mockResolvedValue({
      status: "ok",
      found: 40,
      added: 26,
      dropped: 14,
      finishedAt: "2026-11-09T00:00:00.000Z",
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ status: "ok", added: 26 });
  });
});
```

- [ ] **Step 5: Run the route tests to verify they fail**

Run: `npm test -- src/app/api/loker/scan`
Expected: FAIL — route module not found.

- [ ] **Step 6: Implement the two routes**

`src/app/api/loker/scan/route.ts`:

```ts
import { after } from "next/server";
import { AuthError, consumeAttempt } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { runScanJob } from "@/lib/loker/run";
import { startScanRun } from "@/lib/loker/store";
import { clientKey } from "@/lib/server/request";

/**
 * Start a background scan.
 *
 * The advisory lock is held on a dedicated pool connection until the job
 * finishes, so a second trigger gets an honest 409 instead of a second scan.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await consumeAttempt(`loker:scan:${clientKey(request)}`, 1, 600_000);
  } catch (error) {
    const limited = error instanceof AuthError;
    return Response.json(
      { ok: false, error: limited ? "rate-limited" : "unavailable" },
      { status: limited ? 429 : 503 },
    );
  }

  let client: Awaited<ReturnType<ReturnType<typeof authDatabase>["connect"]>>;
  try {
    client = await authDatabase().connect();
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  try {
    const lock = await client.query<{ ok: boolean }>(
      "select pg_try_advisory_lock(hashtext('loker_scan')) as ok",
    );
    if (!lock.rows[0]?.ok) {
      client.release();
      return Response.json(
        { ok: false, error: "scan-running" },
        { status: 409 },
      );
    }
  } catch {
    client.release();
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  let runId: number;
  try {
    runId = await startScanRun(session.email);
  } catch {
    await client
      .query("select pg_advisory_unlock(hashtext('loker_scan'))")
      .catch(() => {});
    client.release();
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  after(async () => {
    try {
      await runScanJob(runId);
    } finally {
      await client
        .query("select pg_advisory_unlock(hashtext('loker_scan'))")
        .catch(() => {});
      client.release();
    }
  });

  return Response.json({ ok: true, runId }, { status: 202 });
}
```

`src/app/api/loker/scan/status/route.ts`:

```ts
import { connection } from "next/server";
import { latestScanRun } from "@/lib/loker/store";

/** Poll target for the tool card. Public: it carries no user data. */
export async function GET() {
  await connection();
  const run = await latestScanRun().catch(() => null);
  if (!run) return new Response(null, { status: 204 });
  return Response.json(run, {
    headers: { "Cache-Control": "no-store" },
  });
}
```

- [ ] **Step 7: Run the route tests to verify they pass**

Run: `npm test -- src/app/api/loker/scan`
Expected: PASS.

- [ ] **Step 8: Commit (deferred)**

```bash
git add src/app/api/loker/scan src/lib/loker/scan-client.ts \
  src/lib/loker/scan-client.test.ts
git commit -m "feat(loker): add signed-in scan trigger, status, and browser client"
```

---

## Task 15: Tool contracts

**Files:**
- Create: `src/lib/contracts/tool.ts`
- Test: `src/lib/contracts/tool.test.ts`

**Interfaces:**
- Produces: `JobSearchArgsSchema`, `JobSearchArgs`
- Produces: `ToolCallSchema`, `ToolCall`
- Produces: `ToolSummaryRequestSchema`, `ToolSummaryRequest`
- Produces: `JOB_SEARCH_TOOL` (the OpenAI-compatible tool definition)

- [ ] **Step 1: Write the failing test**

`src/lib/contracts/tool.test.ts`:

```ts
import {
  JOB_SEARCH_TOOL,
  JobSearchArgsSchema,
  ToolSummaryRequestSchema,
} from "@/lib/contracts/tool";

describe("JobSearchArgsSchema", () => {
  it("accepts the minimal call", () => {
    expect(JobSearchArgsSchema.safeParse({ query: "React" }).success).toBe(true);
  });

  it("rejects an unknown key instead of ignoring it", () => {
    expect(
      JobSearchArgsSchema.safeParse({ query: "React", message: "x" }).success,
    ).toBe(false);
  });

  it("caps the query at 200 characters", () => {
    expect(
      JobSearchArgsSchema.safeParse({ query: "a".repeat(201) }).success,
    ).toBe(false);
  });

  it("requires a non-empty query", () => {
    expect(JobSearchArgsSchema.safeParse({ query: "" }).success).toBe(false);
  });

  it("rejects a non-integer salary", () => {
    expect(
      JobSearchArgsSchema.safeParse({ query: "React", salaryMin: 1.5 }).success,
    ).toBe(false);
  });
});

describe("ToolSummaryRequestSchema", () => {
  const posting = {
    title: "Frontend Engineer",
    company: "PT Maju",
    sentinelStatus: "clean",
    luminaRisk: "bersih",
  };

  it("accepts titles, companies, and verdicts", () => {
    expect(
      ToolSummaryRequestSchema.safeParse({ count: 1, postings: [posting] })
        .success,
    ).toBe(true);
  });

  it("rejects a description, which must never leave the device", () => {
    expect(
      ToolSummaryRequestSchema.safeParse({
        count: 1,
        postings: [{ ...posting, description: "kutipan" }],
      }).success,
    ).toBe(false);
  });

  it("rejects more than 20 postings", () => {
    expect(
      ToolSummaryRequestSchema.safeParse({
        count: 21,
        postings: Array.from({ length: 21 }, () => posting),
      }).success,
    ).toBe(false);
  });
});

describe("JOB_SEARCH_TOOL", () => {
  it("names the function and requires only the query", () => {
    expect(JOB_SEARCH_TOOL.function.name).toBe("job_search");
    expect(JOB_SEARCH_TOOL.function.parameters.required).toEqual(["query"]);
    expect(JOB_SEARCH_TOOL.function.parameters.additionalProperties).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/contracts/tool.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/contracts/tool.ts`**

```ts
import { z } from "zod";

/**
 * The `job_search` tool contract.
 *
 * `.strict()` at every level: a model that invents a `message` argument gets the
 * call dropped rather than silently forwarded, which is the same privacy
 * posture as `AnswerRequestSchema`.
 */

export const JobSearchArgsSchema = z
  .object({
    query: z.string().min(1).max(200),
    location: z.string().max(80).optional(),
    salaryMin: z.number().int().min(0).optional(),
    salaryMax: z.number().int().min(0).optional(),
    hideFlagged: z.boolean().optional(),
  })
  .strict();

export type JobSearchArgs = z.infer<typeof JobSearchArgsSchema>;

export const ToolCallSchema = z
  .object({
    id: z.string(),
    name: z.literal("job_search"),
    arguments: JobSearchArgsSchema,
  })
  .strict();

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Phase 2 carries no query, no description, no apply URL, and no saved list.
 * The schema is the guarantee, not the prompt.
 */
export const ToolSummaryRequestSchema = z
  .object({
    count: z.number().int().min(0),
    postings: z
      .array(
        z
          .object({
            title: z.string().min(1).max(200),
            company: z.string().min(1).max(200),
            sentinelStatus: z.enum(["clean", "suspicious", "rejected"]),
            luminaRisk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export type ToolSummaryRequest = z.infer<typeof ToolSummaryRequestSchema>;

/** OpenAI-compatible function definition sent to the model. */
export const JOB_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "job_search",
    description:
      "Cari lowongan kerja dari hasil pindai Lumina. Panggil hanya ketika pengguna meminta mencari lowongan, bukan ketika memeriksa pesan penipuan.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Kata kunci lowongan, misalnya 'React remote' atau 'data analyst'.",
        },
        location: {
          type: "string",
          description: "Kota atau wilayah, misalnya 'Jakarta'.",
        },
        salaryMin: {
          type: "integer",
          description: "Gaji minimum dalam rupiah per bulan.",
        },
        salaryMax: {
          type: "integer",
          description: "Gaji maksimum dalam rupiah per bulan.",
        },
        hideFlagged: {
          type: "boolean",
          description:
            "Sembunyikan lowongan yang ditandai salah satu penilaian.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
} as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/contracts/tool.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (deferred)**

```bash
git add src/lib/contracts/tool.ts src/lib/contracts/tool.test.ts
git commit -m "feat(loker): add the job_search tool contract"
```

---

## Task 16: Offer the tool on `/api/companion/answer`

**Files:**
- Modify: `src/app/api/companion/answer/route.ts`
- Modify: `src/lib/companion/answer-client.ts`
- Test: `src/app/api/companion/answer/route.test.ts`

**Interfaces:**
- Consumes: `JOB_SEARCH_TOOL`, `JobSearchArgsSchema`, `ToolCall` (Task 15)
- Produces: response `{ ok: true, text: string, toolCalls: ToolCall[] }`
- Produces: `AnswerResult = { outcome: AnswerOutcome; text: string; toolCalls: ToolCall[] }`

- [ ] **Step 1: Add the failing route tests**

Append to `src/app/api/companion/answer/route.test.ts` (inside the existing
`describe("POST /api/companion/answer")`):

```ts
  it("returns a validated job_search call, even with empty text", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "",
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "job_search",
                    arguments: JSON.stringify({
                      query: "React remote",
                      location: "Jakarta",
                      salaryMin: 8000000,
                    }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan React remote" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      text: "",
      toolCalls: [
        {
          id: "call-1",
          name: "job_search",
          arguments: {
            query: "React remote",
            location: "Jakarta",
            salaryMin: 8000000,
          },
        },
      ],
    });
  });

  it("drops a tool call whose arguments do not validate", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Baik.",
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "job_search",
                    arguments: JSON.stringify({ message: "Halo dari BCA" }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan" }),
    );
    const body = (await response.json()) as { toolCalls: unknown[] };
    expect(body.toolCalls).toEqual([]);
  });

  it("drops an unknown function name", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Baik.",
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: { name: "delete_everything", arguments: "{}" },
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({ lane: "obrolan", question: "cari lowongan" }),
    );
    const body = (await response.json()) as { toolCalls: unknown[] };
    expect(body.toolCalls).toEqual([]);
  });
```

Also update the existing "returns the model's text" assertion so the response
shape is pinned:

```ts
    expect(body).toMatchObject({
      ok: true,
      text: "Pinjol adalah pinjaman ilegal.",
      toolCalls: [],
    });
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm test -- src/app/api/companion/answer/route.test.ts`
Expected: FAIL — `toolCalls` is undefined.

- [ ] **Step 3: Modify the route**

At the top of `src/app/api/companion/answer/route.ts`, add:

```ts
import {
  JOB_SEARCH_TOOL,
  JobSearchArgsSchema,
  type ToolCall,
} from "@/lib/contracts/tool";
```

Add `tools` and `tool_choice` to the upstream body, after `max_tokens`:

```ts
          tools: [JOB_SEARCH_TOOL],
          tool_choice: "auto",
```

Replace the response-parsing block with:

```ts
    const json = (await upstream.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
      }[];
    };
    const message = json.choices?.[0]?.message;
    const text = message?.content?.trim() ?? "";

    const toolCalls: ToolCall[] = [];
    for (const call of message?.tool_calls ?? []) {
      if (call.type && call.type !== "function") continue;
      if (call.function?.name !== "job_search") continue;
      let raw: unknown;
      try {
        raw = JSON.parse(call.function.arguments ?? "");
      } catch {
        continue;
      }
      const parsedArgs = JobSearchArgsSchema.safeParse(raw);
      if (!parsedArgs.success) continue;
      toolCalls.push({
        id: call.id ?? "",
        name: "job_search",
        arguments: parsedArgs.data,
      });
    }

    if (text.length === 0 && toolCalls.length === 0) {
      return fail(503, "upstream-empty");
    }

    return Response.json({ ok: true, text, toolCalls });
```

- [ ] **Step 4: Run the route tests**

Run: `npm test -- src/app/api/companion/answer/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Extend the browser client**

In `src/lib/companion/answer-client.ts`, add:

```ts
import type { ToolCall } from "@/lib/contracts/tool";
```

Change `AnswerResult`:

```ts
export interface AnswerResult {
  outcome: AnswerOutcome;
  text: string;
  toolCalls: ToolCall[];
}
```

Every `return` in `requestAnswer` gains `toolCalls: []`, except the success
path:

```ts
    const body = (await response.json()) as {
      text?: string;
      toolCalls?: ToolCall[];
    };
    const text = body.text?.trim() ?? "";
    const toolCalls = body.toolCalls ?? [];
    if (text.length === 0 && toolCalls.length === 0) {
      return { outcome: "failed", text: "", toolCalls: [] };
    }
    return { outcome: "model", text, toolCalls };
```

- [ ] **Step 6: Run the companion tests**

Run: `npm test -- src/lib/companion src/app/api/companion/answer`
Expected: PASS.

- [ ] **Step 7: Commit (deferred)**

```bash
git add src/app/api/companion/answer src/lib/companion/answer-client.ts \
  src/app/api/companion/answer/route.test.ts
git commit -m "feat(loker): let the model call job_search from the answer route"
```

---

## Task 17: Phase-2 summary route and its browser client

**Files:**
- Create: `src/app/api/companion/tools/summary/route.ts`
- Create: `src/lib/companion/tool-client.ts`
- Test: `src/app/api/companion/tools/summary/route.test.ts`, `src/lib/companion/tool-client.test.ts`

**Interfaces:**
- Consumes: `ToolSummaryRequestSchema`, `ToolSummaryRequest` (Task 15), `BodyTooLarge`, `limitAI`, `readJson`, `upstreamAbort` (existing)
- Produces: `POST /api/companion/tools/summary` → `200 { ok: true, text }` | `400` | `413` | `429` | `503`
- Produces: `requestToolSummary(input: ToolSummaryRequest, signal?: AbortSignal, fetchImpl?: typeof fetch): Promise<string | null>`

- [ ] **Step 1: Write the failing client test**

`src/lib/companion/tool-client.test.ts`:

```ts
import { requestToolSummary } from "@/lib/companion/tool-client";

const posting = {
  title: "Frontend Engineer",
  company: "PT Maju",
  sentinelStatus: "clean" as const,
  luminaRisk: "bersih" as const,
};

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("requestToolSummary", () => {
  it("returns the trimmed sentence", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(response(200, { ok: true, text: "  Ada satu lowongan.  " }));
    await expect(
      requestToolSummary({ count: 1, postings: [posting] }, undefined, fetchImpl),
    ).resolves.toBe("Ada satu lowongan.");
  });

  it("returns null on 503 and on an empty text", async () => {
    await expect(
      requestToolSummary(
        { count: 1, postings: [posting] },
        undefined,
        jest.fn().mockResolvedValue(response(503, { ok: false, error: "not-configured" })),
      ),
    ).resolves.toBeNull();
    await expect(
      requestToolSummary(
        { count: 1, postings: [posting] },
        undefined,
        jest.fn().mockResolvedValue(response(200, { ok: true, text: "   " })),
      ),
    ).resolves.toBeNull();
  });

  it("returns null instead of throwing when offline", async () => {
    await expect(
      requestToolSummary(
        { count: 0, postings: [] },
        undefined,
        jest.fn().mockRejectedValue(new Error("offline")),
      ),
    ).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run the client test to verify it fails**

Run: `npm test -- src/lib/companion/tool-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/companion/tool-client.ts`**

```ts
import type { ToolSummaryRequest } from "@/lib/contracts/tool";

/**
 * Browser side of the phase-2 summary.
 *
 * Never throws, like the other companion clients: an offline venue is the
 * expected case, and the chat always has deterministic copy to fall back to.
 * The payload is built by the caller from `ToolSummaryRequestSchema`, so no
 * query and no description can be added here by accident.
 */
export async function requestToolSummary(
  input: ToolSummaryRequest,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl("/api/companion/tools/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the client test to verify it passes**

Run: `npm test -- src/lib/companion/tool-client.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing route test**

`src/app/api/companion/tools/summary/route.test.ts`:

```ts
/** @jest-environment node */
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn().mockResolvedValue(undefined),
  AuthError: class AuthError extends Error {},
}));

import { consumeAttempt } from "@/lib/auth/accounts";
import { POST } from "@/app/api/companion/tools/summary/route";

const posting = {
  title: "Frontend Engineer",
  company: "PT Maju",
  sentinelStatus: "clean",
  luminaRisk: "bersih",
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/tools/summary", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function upstream(content: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const env = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...env,
    LUMINA_LLM_URL: "http://model.local/v1",
    LUMINA_LLM_MODEL: "test-model",
  };
  jest.mocked(consumeAttempt).mockResolvedValue(undefined);
});

afterAll(() => {
  process.env = env;
});

describe("POST /api/companion/tools/summary", () => {
  it("rejects a body carrying a description", async () => {
    const response = await POST(
      request({
        count: 1,
        postings: [{ ...posting, description: "kutipan" }],
      }),
    );
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("forwards titles, companies, verdicts, and a count only", async () => {
    const fetchMock = jest.fn().mockResolvedValue(upstream("Ada satu lowongan."));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(request({ count: 1, postings: [posting] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      text: "Ada satu lowongan.",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { messages: { role: string; content: string }[] };
    const sent = body.messages[1]?.content ?? "";
    expect(sent).toContain("Frontend Engineer");
    expect(sent).not.toContain("description");
    expect(sent).not.toContain("query");
  });

  it("returns 503 not-configured when the model is unset", async () => {
    process.env.LUMINA_LLM_URL = "";
    const response = await POST(request({ count: 0, postings: [] }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not-configured",
    });
  });

  it("returns 503 when the model answers nothing", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(upstream("  ")) as unknown as typeof fetch;
    const response = await POST(request({ count: 1, postings: [posting] }));
    expect(response.status).toBe(503);
  });
});
```

- [ ] **Step 6: Run the route test to verify it fails**

Run: `npm test -- src/app/api/companion/tools/summary`
Expected: FAIL — route module not found.

- [ ] **Step 7: Implement the route**

`src/app/api/companion/tools/summary/route.ts`:

```ts
import { ToolSummaryRequestSchema } from "@/lib/contracts/tool";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/** Must stay below the client's 21 s summary abort. */
const DEADLINE_MS = 20000;

const MAX_TOKENS = 160;

const SYSTEM = [
  "Kamu adalah Lumina, pendamping pencari kerja di Indonesia.",
  "Kamu menerima daftar lowongan yang sudah disaring di perangkat pengguna.",
  "Tulis tepat satu kalimat Bahasa Indonesia yang menyebut jumlah lowongan dan, bila ada, satu posisi atau perusahaan yang paling relevan.",
  "Jangan menilai ulang, jangan menambah temuan, jangan menyebut skor, dan jangan mengarang lowongan yang tidak ada di daftar.",
  "Tanpa salam, tanpa markdown, tanpa daftar.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

/**
 * Phase 2: one sentence about the postings the client already filtered.
 *
 * The request schema has no field for the query, a description, an apply URL,
 * or the saved list, so "the query never leaves the device" is structural.
 * Same posture as `/answer`: no session required, rate-limited, 20 s deadline.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 65536);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }
  const parsed = ToolSummaryRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-request");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const limited = await limitAI(request, "text");
  if (limited) return limited;
  const upstreamControl = upstreamAbort(request, DEADLINE_MS);

  try {
    const upstream = await fetch(
      `${base.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: upstreamControl.signal,
        headers: {
          "content-type": "application/json",
          ...(process.env.LUMINA_LLM_KEY
            ? { authorization: `Bearer ${process.env.LUMINA_LLM_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.3,
          reasoning_effort: "none",
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify(parsed.data) },
          ],
        }),
      },
    );

    if (!upstream.ok) return fail(503, "upstream-failed");

    const json = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (text.length === 0) return fail(503, "upstream-empty");

    return Response.json({ ok: true, text });
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return fail(503, aborted ? "upstream-timeout" : "upstream-unreachable");
  } finally {
    upstreamControl.cleanup();
  }
}
```

- [ ] **Step 8: Run the route and client tests**

Run: `npm test -- src/app/api/companion/tools/summary src/lib/companion/tool-client.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit (deferred)**

```bash
git add src/app/api/companion/tools/summary src/lib/companion/tool-client.ts \
  src/lib/companion/tool-client.test.ts
git commit -m "feat(loker): add the phase-2 summary route and client"
```

---

## Task 18: Add the `job-search` trace stage

**Files:**
- Modify: `src/lib/contracts/agent-run.ts`
- Modify: `src/components/companion/agent-run.tsx`
- Test: `src/lib/contracts/trace-contract.test.ts`, `src/components/companion/agent-run.test.tsx`

**Interfaces:**
- Produces: `StageId = AgentId | "voice" | "job-search"`
- Produces: `STAGE_LABEL["job-search"] = { label: "Pencari Lowongan", task: "Mencari lowongan dari hasil pindai" }`
- Produces: `AgentRun` renders the stage as a non-detector and subtracts its `ms` from `engineMs`

- [ ] **Step 1: Add the failing contract and component tests**

Append to `src/lib/contracts/trace-contract.test.ts`:

```ts
  it("labels the job-search stage as a non-detector", () => {
    expect(STAGE_LABEL["job-search"]).toEqual({
      label: "Pencari Lowongan",
      task: expect.any(String),
    });
    expect(AGENT_IDS).not.toContain("job-search");
  });
```

Append to `src/components/companion/agent-run.test.tsx`:

```tsx
  it("renders job-search as a non-detector row", () => {
    const withSearch: AgentTrace = {
      ...trace,
      stages: [
        ...trace.stages,
        stage({
          id: "job-search",
          label: "Pencari Lowongan",
          status: "selesai",
          findings: 0,
          ms: 3,
          note: "2 lowongan cocok",
        }),
      ],
      totalMs: 15,
    };
    render(<AgentRun trace={withSearch} />);
    const row = screen.getByTestId("agent-job-search");
    expect(within(row).getByText("Pencari Lowongan")).toBeInTheDocument();
    // It searches the scan, it does not inspect the message: no "0 temuan".
    expect(within(row).queryByText(/0 temuan/)).not.toBeInTheDocument();
    expect(within(row).getByText("Selesai")).toBeInTheDocument();
    expect(within(row).getByText("2 lowongan cocok")).toBeInTheDocument();
  });

  it("subtracts voice and job-search from the engine time", () => {
    const withSearch: AgentTrace = {
      stages: [
        stage({ id: "message", status: "selesai", ms: 1 }),
        stage({ id: "voice", label: "Penyusun bahasa", status: "selesai", ms: 5 }),
        stage({
          id: "job-search",
          label: "Pencari Lowongan",
          status: "selesai",
          ms: 2,
        }),
      ],
      totalMs: 8,
    };
    render(<AgentRun trace={withSearch} />);
    // 8 - 5 - 2 = 1 ms of detector work.
    expect(screen.getByText(/1,0 ms/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/contracts/trace-contract.test.ts src/components/companion/agent-run.test.tsx`
Expected: FAIL — `"job-search"` is not assignable to `StageId`.

- [ ] **Step 3: Extend the contract**

In `src/lib/contracts/agent-run.ts`, change:

```ts
/** `voice` and `job-search` are not detectors, so they do not belong in `AgentId`. */
export type StageId = AgentId | "voice" | "job-search";
```

Add to `STAGE_LABEL`, after `voice`:

```ts
  "job-search": {
    label: "Pencari Lowongan",
    task: "Mencari lowongan dari hasil pindai",
  },
```

- [ ] **Step 4: Render the stage in `agent-run.tsx`**

Add `Briefcase` to the lucide import.

In `AgentBubble`, replace the identity/soft/icon setup:

```tsx
  const profile = isDetector(stage.id) ? AGENT_REGISTRY[stage.id] : null;
  const isSearch = stage.id === "job-search";
  const identity = isSearch
    ? "var(--lumina-agent-job)"
    : profile
      ? `var(${profile.identity})`
      : "var(--lumina-brand)";
  const soft = isSearch
    ? "var(--lumina-agent-job-soft)"
    : profile
      ? `var(${profile.identity}-soft)`
      : "var(--lumina-brand-soft)";
```

In the portrait/icon branch, replace the final fallback:

```tsx
                ) : isSearch ? (
                  <Briefcase className="size-3.5" />
                ) : (
                  <PenLine className="size-3.5" />
                )}
```

In `AgentRun`, after `const voice = byId.get("voice");`:

```tsx
  const jobSearch = byId.get("job-search");
```

Change `engineMs`:

```tsx
  const engineMs = Math.max(
    0,
    trace.totalMs - (voice?.ms ?? 0) - (jobSearch?.ms ?? 0),
  );
```

In `runAnnouncement`, add the search sentence after `language`:

```tsx
  const search = byId.get("job-search");
  const searched = search?.note ? ` ${search.note}.` : "";
```

and append `${searched}` to both return strings.

Render the row between the specialist list and the voice row:

```tsx
        {jobSearch ? (
          <motion.li
            key={jobSearch.id}
            variants={agentVariants}
            className="min-w-0"
          >
            <AgentBubble
              stage={jobSearch}
              result={result}
              live={live && jobSearch.status === "berjalan"}
              reduced={reduce ?? false}
            />
          </motion.li>
        ) : null}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/contracts/trace-contract.test.ts src/components/companion/agent-run.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit (deferred)**

```bash
git add src/lib/contracts/agent-run.ts src/components/companion/agent-run.tsx \
  src/lib/contracts/trace-contract.test.ts \
  src/components/companion/agent-run.test.tsx
git commit -m "feat(loker): add the job-search trace stage"
```

---

## Task 19: Load the capped corpus in the RSC shell

**Files:**
- Create: `src/lib/loker/corpus.ts`
- Modify: `src/components/companion/companion-with-session.tsx`
- Modify: `src/components/companion/companion-chat.tsx` (accept the prop only; the tool flow is Task 22)
- Modify: `docs/superpowers/plans/2026-11-09-loker-tool.md` (file map row for `corpus.ts`)
- Test: `src/lib/loker/corpus.test.ts`, `src/components/companion/companion-with-session.test.tsx`

**Interfaces:**
- Consumes: `loadCorpus(limit)` (Task 11), `LokerCorpus`/`LokerView` (Task 10)
- Produces: `CORPUS_LIMIT = 300`, `CORPUS_BUDGET_BYTES = 500_000`, `capCorpus(postings, total, budgetBytes?): LokerCorpus`
- Produces: `CompanionChat` accepts `corpus?: LokerCorpus`

- [ ] **Step 1: Write the failing cap test**

`src/lib/loker/corpus.test.ts`:

```ts
import { capCorpus, CORPUS_LIMIT } from "@/lib/loker/corpus";
import type { LokerView } from "@/lib/loker/types";

function posting(i: number): LokerView {
  return {
    urlKey: `https://example.com/${i}`,
    title: `Lowongan ${i}`,
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: null,
    tags: [],
    description: "x".repeat(100),
    applyUrl: null,
    source: "Jobstreet",
    postedAt: null,
    fetchedAt: "2026-11-09T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
  };
}

describe("capCorpus", () => {
  it("keeps the newest order and reports the honest total", () => {
    const rows = Array.from({ length: 5 }, (_, i) => posting(i));
    const out = capCorpus(rows, 5);
    expect(out.postings.map((row) => row.urlKey)).toEqual([
      "https://example.com/0",
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
      "https://example.com/4",
    ]);
    expect(out.total).toBe(5);
    expect(out.capped).toBe(false);
  });

  it("lowers the cap to stay inside the serialization budget", () => {
    const rows = Array.from({ length: 5 }, (_, i) => posting(i));
    const one = new TextEncoder().encode(JSON.stringify(rows[0])).byteLength;
    const out = capCorpus(rows, 5, one * 2 + 10);
    expect(out.postings).toHaveLength(2);
    expect(out.total).toBe(5);
    expect(out.capped).toBe(true);
  });

  it("never returns more than CORPUS_LIMIT", () => {
    const rows = Array.from({ length: CORPUS_LIMIT + 5 }, (_, i) =>
      posting(i),
    );
    const out = capCorpus(rows, rows.length, Number.MAX_SAFE_INTEGER);
    expect(out.postings).toHaveLength(CORPUS_LIMIT);
    expect(out.capped).toBe(true);
  });
});
```

- [ ] **Step 2: Run the cap test to verify it fails**

Run: `npm test -- src/lib/loker/corpus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/loker/corpus.ts`**

```ts
import type { LokerCorpus, LokerView } from "@/lib/loker/types";

/** The number of rows the RSC loader asks the database for. */
export const CORPUS_LIMIT = 300;

/**
 * The serialization budget the RSC payload may carry. The card prints the real
 * count, so lowering the cap is visible rather than silent.
 */
export const CORPUS_BUDGET_BYTES = 500_000;

const encoder = new TextEncoder();

/**
 * Keep the newest rows until the payload budget is reached.
 *
 * Order is preserved: `loadCorpus` returns newest `fetched_at` first, and the
 * card says "lowongan terbaru". `capped` is true whenever the caller is shown
 * fewer rows than the database holds, whether the limit or the budget caused it.
 */
export function capCorpus(
  postings: readonly LokerView[],
  total: number,
  budgetBytes: number = CORPUS_BUDGET_BYTES,
): LokerCorpus {
  const kept: LokerView[] = [];
  let bytes = 0;

  for (const posting of postings) {
    if (kept.length >= CORPUS_LIMIT) break;
    const size = encoder.encode(JSON.stringify(posting)).byteLength;
    // Always keep at least one row so a tiny budget cannot produce a lie.
    if (kept.length > 0 && bytes + size > budgetBytes) break;
    kept.push(posting);
    bytes += size;
  }

  return { postings: kept, total, capped: kept.length < total };
}
```

- [ ] **Step 4: Run the cap test to verify it passes**

Run: `npm test -- src/lib/loker/corpus.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Accept the prop in `CompanionChat`**

At the top of the `CompanionChat` signature in
`src/components/companion/companion-chat.tsx`, add the prop and import:

```ts
import type { LokerCorpus } from "@/lib/loker/types";

const EMPTY_CORPUS: LokerCorpus = {
  postings: [],
  total: 0,
  capped: false,
};

export function CompanionChat({
  session = null,
  initialPanel,
  corpus = EMPTY_CORPUS,
}: {
  session?: CompanionSession | null;
  /** Set when another surface links straight into the detector overview. */
  initialPanel?: "agen";
  /** The capped cumulative scan snapshot; the client filters it locally. */
  corpus?: LokerCorpus;
}) {
```

Do not use `corpus` yet; Task 22 consumes it. A default keeps the
`Suspense` fallback `<CompanionChat />` valid.

- [ ] **Step 6: Write the failing loader test**

`src/components/companion/companion-with-session.test.tsx`:

```tsx
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/loker/store", () => ({ loadCorpus: jest.fn() }));
jest.mock("@/components/companion/companion-chat", () => ({
  CompanionChat: (props: {
    corpus: { postings: unknown[]; total: number; capped: boolean };
  }) => (
    <div
      data-testid="chat"
      data-total={props.corpus.total}
      data-count={props.corpus.postings.length}
      data-capped={String(props.corpus.capped)}
    />
  ),
}));

import { render, screen } from "@testing-library/react";
import { CompanionWithSession } from "@/components/companion/companion-with-session";
import { getSession } from "@/lib/auth/server-session";
import { loadCorpus } from "@/lib/loker/store";
import type { LokerView } from "@/lib/loker/types";

function posting(): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: null,
    tags: [],
    description: "Membangun antarmuka.",
    applyUrl: null,
    source: "Jobstreet",
    postedAt: null,
    fetchedAt: "2026-11-09T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
  };
}

describe("CompanionWithSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes the capped corpus to the chat", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    jest.mocked(loadCorpus).mockResolvedValue({
      postings: [posting()],
      total: 5,
    });

    render(
      await CompanionWithSession({ searchParams: Promise.resolve({}) }),
    );
    const chat = screen.getByTestId("chat");
    expect(chat).toHaveAttribute("data-total", "5");
    expect(chat).toHaveAttribute("data-count", "1");
    expect(chat).toHaveAttribute("data-capped", "true");
  });

  it("falls back to an empty corpus when the database is unavailable", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    jest.mocked(loadCorpus).mockRejectedValue(new Error("down"));

    render(
      await CompanionWithSession({ searchParams: Promise.resolve({}) }),
    );
    const chat = screen.getByTestId("chat");
    expect(chat).toHaveAttribute("data-total", "0");
    expect(chat).toHaveAttribute("data-count", "0");
    expect(chat).toHaveAttribute("data-capped", "false");
  });
});
```

- [ ] **Step 7: Run the loader test to verify it fails**

Run: `npm test -- src/components/companion/companion-with-session.test.tsx`
Expected: FAIL — `CompanionWithSession` does not load a corpus.

- [ ] **Step 8: Implement the loader**

Replace `src/components/companion/companion-with-session.tsx` with:

```tsx
import { CompanionChat } from "@/components/companion/companion-chat";
import { getSession } from "@/lib/auth/server-session";
import { CORPUS_LIMIT, capCorpus } from "@/lib/loker/corpus";
import { loadCorpus } from "@/lib/loker/store";
import type { LokerCorpus } from "@/lib/loker/types";

const EMPTY_CORPUS: LokerCorpus = {
  postings: [],
  total: 0,
  capped: false,
};

/**
 * The session read and the corpus read both belong to request time.
 *
 * `loadCorpus` is the only database read on this page and it is allowed to
 * fail: a database outage must not take the companion down, because the
 * message checker is entirely local. A failed read is an empty corpus, not an
 * error page.
 */
export async function CompanionWithSession({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const [session, { panel }, corpus] = await Promise.all([
    getSession(),
    searchParams,
    loadCorpus(CORPUS_LIMIT)
      .then(({ postings, total }) => capCorpus(postings, total))
      .catch(() => EMPTY_CORPUS),
  ]);

  return (
    <CompanionChat
      session={session ? { nama: session.nama, email: session.email } : null}
      initialPanel={panel === "agen" ? "agen" : undefined}
      corpus={corpus}
    />
  );
}
```

- [ ] **Step 9: Update the plan's file map**

Add a row to the plan's file map table:

```markdown
| `src/lib/loker/corpus.ts` | `capCorpus` serialization budget | 19 |
```

- [ ] **Step 10: Run the loader and chat suites**

Run: `npm test -- src/lib/loker/corpus.test.ts src/components/companion/companion-with-session.test.tsx src/components/companion/companion-chat.test.tsx`
Expected: PASS.

- [ ] **Step 11: Commit (deferred)**

```bash
git add src/lib/loker/corpus.ts src/lib/loker/corpus.test.ts \
  src/components/companion/companion-with-session.tsx \
  src/components/companion/companion-with-session.test.tsx \
  src/components/companion/companion-chat.tsx
git commit -m "feat(loker): load a capped scan corpus in the companion RSC shell"
```

---

## Task 20: The posting card and the tool surface

**Files:**
- Create: `src/components/companion/loker-card.tsx`
- Create: `src/components/companion/loker-tool.tsx`
- Test: `src/components/companion/loker-tool.test.tsx`

**Interfaces:**
- Consumes: `LokerCorpus`, `LokerSearchArgs`, `LokerView`, `SavedLoker` (Task 10), `filterPostings` (Task 10), `triggerScan`/`pollScan` (Task 14)
- Produces: `LokerCard({ posting, saved, onToggleSave })`
- Produces: `LokerTool({ corpus, initialArgs, summaryState, canRefresh, saved, onToggleSave })`

- [ ] **Step 1: Write the failing test**

`src/components/companion/loker-tool.test.tsx`:

```tsx
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LokerTool } from "@/components/companion/loker-tool";
import type { LokerCorpus, LokerView } from "@/lib/loker/types";

function posting(over: Partial<LokerView> = {}): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: 10_000_000,
    salaryMax: 15_000_000,
    salaryText: "Rp10-15 jt",
    tags: ["React"],
    description: "Membangun antarmuka React.",
    applyUrl: "https://example.com/1",
    source: "Jobstreet",
    postedAt: "2026-11-01",
    fetchedAt: "2026-11-09T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
    ...over,
  };
}

const corpus: LokerCorpus = {
  postings: [
    posting(),
    posting({
      urlKey: "https://example.com/2",
      title: "Backend Engineer",
      company: "PT Mundur",
      sentinelStatus: "suspicious",
      sentinelFlags: ["Biaya pendaftaran"],
      luminaRisk: "rendah",
    }),
  ],
  total: 2,
  capped: false,
};

const baseProps = {
  corpus,
  initialArgs: { query: "" },
  summaryState: "done" as const,
  canRefresh: false,
  saved: [],
  onToggleSave: jest.fn(),
};

describe("LokerTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prints both verdicts and the disagreement copy", () => {
    render(<LokerTool {...baseProps} />);
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Sentinel: bersih/)).toBeInTheDocument();
    expect(screen.getByText(/Sentinel: mencurigakan/)).toBeInTheDocument();
    expect(screen.getAllByText(/Lumina: rendah/)).toHaveLength(1);
    expect(
      screen.getByText(
        /penilaian berbeda: sentinel mencurigakan, lumina rendah/i,
      ),
    ).toBeInTheDocument();
  });

  it("hides flagged postings when the toggle is on", async () => {
    const user = userEvent.setup();
    render(<LokerTool {...baseProps} />);
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    await user.click(
      screen.getByRole("checkbox", { name: /sembunyikan yang ditandai/i }),
    );
    expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
  });

  it("narrows the list from the keyword field", async () => {
    const user = userEvent.setup();
    render(<LokerTool {...baseProps} />);
    await user.type(
      screen.getByLabelText(/kata kunci lowongan/i),
      "Backend",
    );
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Engineer")).not.toBeInTheDocument();
  });

  it("prints the honest cap instead of pretending to show everything", () => {
    render(
      <LokerTool
        {...baseProps}
        corpus={{ postings: [posting()], total: 9, capped: true }}
      />,
    );
    expect(
      screen.getByText(/menampilkan 1 lowongan terbaru dari 9 hasil pindai/i),
    ).toBeInTheDocument();
  });

  it("shows the honest empty state", () => {
    render(
      <LokerTool {...baseProps} initialArgs={{ query: "tidak-ada" }} />,
    );
    expect(
      screen.getByText(/tidak ada lowongan yang cocok/i),
    ).toBeInTheDocument();
  });

  it("saves a posting through the card action", async () => {
    const user = userEvent.setup();
    const onToggleSave = jest.fn();
    render(<LokerTool {...baseProps} onToggleSave={onToggleSave} />);
    await user.click(
      screen.getByRole("button", { name: /simpan frontend engineer/i }),
    );
    expect(onToggleSave).toHaveBeenCalledWith(corpus.postings[0]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/companion/loker-tool.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/companion/loker-card.tsx`**

```tsx
"use client";

import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Risk } from "@/lib/contracts/score";
import type { LokerView } from "@/lib/loker/types";

const SENTINEL_LABEL = {
  clean: "bersih",
  suspicious: "mencurigakan",
  rejected: "ditolak",
} as const;

const RISK_LABEL: Record<Risk, string> = {
  bersih: "bersih",
  rendah: "rendah",
  mencurigakan: "mencurigakan",
  tinggi: "tinggi",
};

function flagged(posting: LokerView): boolean {
  return (
    posting.sentinelStatus !== "clean" ||
    posting.luminaRisk === "mencurigakan" ||
    posting.luminaRisk === "tinggi"
  );
}

function disagreement(posting: LokerView): boolean {
  const sentinelCaution = posting.sentinelStatus !== "clean";
  const luminaCaution =
    posting.luminaRisk === "mencurigakan" || posting.luminaRisk === "tinggi";
  return sentinelCaution !== luminaCaution;
}

function tone(posting: LokerView): "default" | "secondary" | "destructive" {
  if (posting.sentinelStatus === "rejected" || posting.luminaRisk === "tinggi") {
    return "destructive";
  }
  return flagged(posting) ? "secondary" : "default";
}

/**
 * One posting with both verdicts, never one standing in for the other.
 *
 * When they disagree the card says so and the caution wins: the posting is
 * already flagged for the "hide flagged" filter, and the sentence explains why
 * it is still on screen when that filter is off.
 */
export function LokerCard({
  posting,
  saved,
  onToggleSave,
}: {
  posting: LokerView;
  saved: boolean;
  onToggleSave: (posting: LokerView) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <li className="min-w-0 rounded-[12px] border border-line bg-panel">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-[13px] text-txt">
                {posting.title}
              </p>
              <p className="truncate text-[11px] text-dim">{posting.company}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={
                saved
                  ? `Hapus ${posting.title} dari simpanan`
                  : `Simpan ${posting.title}`
              }
              aria-pressed={saved}
              onClick={() => onToggleSave(posting)}
            >
              {saved ? (
                <BookmarkCheck aria-hidden />
              ) : (
                <Bookmark aria-hidden />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-dim">
            {posting.location ? (
              <span className="flex items-center gap-0.5">
                <MapPin aria-hidden className="size-3" />
                {posting.location}
              </span>
            ) : null}
            <span className="flex items-center gap-0.5">
              <Wallet aria-hidden className="size-3" />
              {posting.salaryText ?? "Gaji tidak dicantumkan"}
            </span>
            <span>{posting.source}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <Badge variant={tone(posting)}>
              Sentinel: {SENTINEL_LABEL[posting.sentinelStatus]}
            </Badge>
            <Badge variant={flagged(posting) ? "secondary" : "outline"}>
              Lumina: {RISK_LABEL[posting.luminaRisk]}
            </Badge>
            {posting.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          {disagreement(posting) ? (
            <p className="text-[11px] text-warn leading-snug">
              Penilaian berbeda: Sentinel{" "}
              {SENTINEL_LABEL[posting.sentinelStatus]}, Lumina{" "}
              {RISK_LABEL[posting.luminaRisk]}. Anggap perlu kehati-hatian.
            </p>
          ) : null}

          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit px-0 text-[11px] text-brand-ink"
            >
              {open ? "Tutup detail" : "Lihat detail"}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="flex flex-col gap-2 border-line border-t px-3 py-3">
            <p className="whitespace-pre-wrap text-[11px] text-txt leading-relaxed">
              {posting.description}
            </p>

            {posting.sentinelFlags.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-txt">
                  Catatan Sentinel
                </p>
                <ul className="list-disc pl-4 text-[11px] text-dim">
                  {posting.sentinelFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {posting.luminaSignals.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-txt">
                  Sinyal Lumina
                </p>
                <ul className="list-disc pl-4 text-[11px] text-dim">
                  {posting.luminaSignals.map((signal) => (
                    <li key={signal.label}>{signal.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-1 text-[10px] text-dim">
              <div className="min-w-0">
                <dt>Email perusahaan</dt>
                <dd className="truncate text-txt">
                  {posting.companyEmail || "Tidak ditemukan"}
                </dd>
              </div>
              <div>
                <dt>Umur domain</dt>
                <dd className="tabular text-txt">{posting.domainAgeDays} hari</dd>
              </div>
              <div>
                <dt>Dipindai</dt>
                <dd className="tabular text-txt">
                  {posting.fetchedAt.slice(0, 10)}
                </dd>
              </div>
              <div>
                <dt>Diposting</dt>
                <dd className="tabular text-txt">
                  {posting.postedAt ?? "Tidak diketahui"}
                </dd>
              </div>
            </dl>

            {posting.applyUrl ? (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <a
                  href={posting.applyUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Buka lamaran <ExternalLink aria-hidden />
                </a>
              </Button>
            ) : (
              <p className="text-[11px] text-dim">
                Tautan lamaran tidak tersedia.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
```

- [ ] **Step 4: Implement `src/components/companion/loker-tool.tsx`**

```tsx
"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { LokerCard } from "@/components/companion/loker-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { pollScan, triggerScan } from "@/lib/loker/scan-client";
import { filterPostings } from "@/lib/loker/search";
import type {
  LokerCorpus,
  LokerSearchArgs,
  LokerView,
  SavedLoker,
  ScanRunStatus,
} from "@/lib/loker/types";

type ScanState = "idle" | "starting" | "running" | "done" | "failed";

function parseRupiah(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

/**
 * The inline job-search surface.
 *
 * It receives the whole capped corpus and filters locally, so changing a filter
 * is not a network call and clearing it restores postings the first filter
 * removed. The scan button only refills the corpus for the next search; it
 * never blocks the results already on screen.
 */
export function LokerTool({
  corpus,
  initialArgs,
  summaryState,
  canRefresh,
  saved,
  onToggleSave,
}: {
  corpus: LokerCorpus;
  initialArgs: LokerSearchArgs;
  summaryState: "idle" | "running" | "done" | "failed";
  canRefresh: boolean;
  saved: readonly SavedLoker[];
  onToggleSave: (posting: LokerView) => void;
}) {
  const router = useRouter();
  const [args, setArgs] = React.useState<LokerSearchArgs>(initialArgs);
  const [scan, setScan] = React.useState<ScanState>("idle");
  const [lastRun, setLastRun] = React.useState<ScanRunStatus | null>(null);

  React.useEffect(() => {
    if (!canRefresh) return;
    let cancelled = false;
    fetch("/api/loker/scan/status", { cache: "no-store" })
      .then((response) =>
        response.status === 204 ? null : (response.json() as Promise<ScanRunStatus>),
      )
      .then((status) => {
        if (!cancelled) setLastRun(status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canRefresh]);

  const results = React.useMemo(
    () => filterPostings(corpus.postings, args),
    [corpus.postings, args],
  );
  const savedIds = React.useMemo(
    () => new Set(saved.map((item) => item.id)),
    [saved],
  );

  const scanning = scan === "starting" || scan === "running";
  const lastScan = corpus.postings[0]?.fetchedAt ?? null;

  const refresh = async () => {
    if (!canRefresh || scanning) return;
    setScan("starting");
    const started = await triggerScan();
    if (started === "unauthorized" || started === "failed") {
      setScan("failed");
      return;
    }
    setScan("running");
    const result = await pollScan((status) => setLastRun(status), {
      intervalMs: 3000,
    });
    if (result?.status === "ok") {
      setScan("done");
      router.refresh();
      return;
    }
    setScan("failed");
  };

  return (
    <section
      aria-label="Pencari lowongan"
      className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-line bg-panel-2/40 p-3"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium text-[12px] text-txt">
            Pencari Lowongan
          </h3>
          <p className="tabular text-[10px] text-dim">
            {results.length} dari {corpus.postings.length} lowongan di
            perangkat ini
          </p>
          <p className="tabular text-[10px] text-dim">
            {lastScan
              ? `Terakhir dipindai ${lastScan.slice(0, 10)}`
              : "Belum pernah dipindai"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={!canRefresh || scanning}
          aria-label="Pindai ulang lowongan"
        >
          {scanning ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <RefreshCw aria-hidden />
          )}
          {!canRefresh
            ? "Masuk untuk memindai"
            : scanning
              ? "Memindai…"
              : "Pindai ulang"}
        </Button>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[10px] text-dim">
          Kata kunci
          <Input
            value={args.query}
            onChange={(event) =>
              setArgs((prev) => ({ ...prev, query: event.target.value }))
            }
            placeholder="React, data analyst…"
            aria-label="Kata kunci lowongan"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-dim">
          Lokasi
          <Input
            value={args.location ?? ""}
            onChange={(event) =>
              setArgs((prev) => ({
                ...prev,
                location: event.target.value || undefined,
              }))
            }
            placeholder="Jakarta"
            aria-label="Lokasi lowongan"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-dim">
          Gaji minimum (Rp)
          <Input
            inputMode="numeric"
            value={args.salaryMin ?? ""}
            onChange={(event) =>
              setArgs((prev) => ({
                ...prev,
                salaryMin: parseRupiah(event.target.value),
              }))
            }
            placeholder="8000000"
            aria-label="Gaji minimum"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-dim">
          Gaji maksimum (Rp)
          <Input
            inputMode="numeric"
            value={args.salaryMax ?? ""}
            onChange={(event) =>
              setArgs((prev) => ({
                ...prev,
                salaryMax: parseRupiah(event.target.value),
              }))
            }
            placeholder="15000000"
            aria-label="Gaji maksimum"
          />
        </label>
      </div>

      <label className="flex min-h-[44px] items-center gap-2 text-[11px] text-txt">
        <Checkbox
          checked={args.hideFlagged ?? false}
          onCheckedChange={(checked) =>
            setArgs((prev) => ({ ...prev, hideFlagged: checked === true }))
          }
        />
        Sembunyikan yang ditandai salah satu penilaian
      </label>

      {scan === "failed" ? (
        <p className="text-[11px] text-danger">
          Pindai gagal dimulai. Hasil lama tetap ditampilkan.
        </p>
      ) : null}
      {scan === "running" ? (
        <p className="text-[11px] text-dim">
          Pindai berjalan di latar belakang; hasil lama tetap ditampilkan.
        </p>
      ) : null}
      {corpus.capped ? (
        <p className="text-[11px] text-dim">
          Menampilkan {corpus.postings.length} lowongan terbaru dari{" "}
          {corpus.total} hasil pindai.
        </p>
      ) : null}
      {lastRun ? (
        <p className="text-[11px] text-dim">
          Pindai terakhir: {lastRun.added} ditambahkan, {lastRun.dropped} dibuang
          karena data audit tidak lengkap.
        </p>
      ) : null}
      {summaryState === "running" ? (
        <p className="text-[11px] text-dim">Menyusun ringkasan…</p>
      ) : null}

      {results.length === 0 ? (
        <div className="rounded-[10px] border border-line border-dashed px-3 py-6 text-center">
          <p className="font-medium text-[12px] text-txt">
            {corpus.total === 0
              ? "Belum ada hasil pindai"
              : "Tidak ada lowongan yang cocok"}
          </p>
          <p className="mt-1 text-[11px] text-dim">
            {corpus.total === 0
              ? canRefresh
                ? "Tekan Pindai ulang untuk mengambil lowongan terbaru."
                : "Masuk untuk memindai lowongan."
              : "Longgarkan kata kunci, lokasi, atau saringan gaji."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((posting) => (
            <LokerCard
              key={posting.urlKey}
              posting={posting}
              saved={savedIds.has(posting.urlKey)}
              onToggleSave={onToggleSave}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/companion/loker-tool.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit (deferred)**

```bash
git add src/components/companion/loker-card.tsx \
  src/components/companion/loker-tool.tsx \
  src/components/companion/loker-tool.test.tsx
git commit -m "feat(loker): render the inline job-search card"
```

---

## Task 21: Saved postings on the device and in `/profil`

**Files:**
- Create: `src/lib/loker/saved.ts`
- Create: `src/lib/loker/use-saved.ts`
- Create: `src/components/profil/profil-loker.tsx`
- Modify: `src/components/profil/profil-view.tsx`
- Test: `src/lib/loker/saved.test.ts`, `src/components/profil/profil-loker.test.tsx`

**Interfaces:**
- Produces: `SAVED_KEY = "lumina-saved-loker"`, `SAVED_EVENT = "lumina:saved-loker"`
- Produces: `loadSaved()`, `writeSaved()`, `snapshotOf(posting)`, `toggleSaved(posting)`, `removeSaved(id)`
- Produces: `useSavedLoker(): { saved: SavedLoker[]; loaded: boolean; toggle(posting): void; remove(id): void }`
- Produces: `<ProfilLoker />`

- [ ] **Step 1: Write the failing store test**

`src/lib/loker/saved.test.ts`:

```ts
import { loadSaved, removeSaved, toggleSaved } from "@/lib/loker/saved";
import type { LokerView } from "@/lib/loker/types";

function posting(over: Partial<LokerView> = {}): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: "Rp10-15 jt",
    tags: [],
    description: "Membangun antarmuka.",
    applyUrl: null,
    source: "Jobstreet",
    postedAt: null,
    fetchedAt: "2026-11-09T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
    ...over,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("saved postings", () => {
  it("adds then removes a snapshot by url key", () => {
    const afterAdd = toggleSaved(posting());
    expect(afterAdd).toHaveLength(1);
    expect(afterAdd[0]).toMatchObject({
      id: "https://example.com/1",
      title: "Frontend Engineer",
      sentinelStatus: "clean",
      luminaRisk: "bersih",
    });
    expect(loadSaved()).toHaveLength(1);

    const afterRemove = toggleSaved(posting());
    expect(afterRemove).toEqual([]);
    expect(loadSaved()).toEqual([]);
  });

  it("removes by id", () => {
    toggleSaved(posting());
    removeSaved("https://example.com/1");
    expect(loadSaved()).toEqual([]);
  });

  it("ignores malformed storage instead of throwing", () => {
    window.localStorage.setItem("lumina-saved-loker", "{not json");
    expect(loadSaved()).toEqual([]);
    window.localStorage.setItem(
      "lumina-saved-loker",
      JSON.stringify([{ id: 1 }]),
    );
    expect(loadSaved()).toEqual([]);
  });

  it("keeps the newest save first", () => {
    toggleSaved(posting({ urlKey: "https://example.com/a", title: "A" }));
    toggleSaved(posting({ urlKey: "https://example.com/b", title: "B" }));
    expect(loadSaved().map((item) => item.title)).toEqual(["B", "A"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/loker/saved.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/loker/saved.ts`**

```ts
import { z } from "zod";
import type { LokerView, SavedLoker } from "@/lib/loker/types";

/**
 * Saved postings are a device-local snapshot, never a server record.
 *
 * The snapshot is deliberately smaller than `LokerView`: no description, no
 * apply URL, no signals. It is enough to recognise the posting and re-find it
 * from the next scan, and it keeps the storage key small.
 */

export const SAVED_KEY = "lumina-saved-loker";
export const SAVED_EVENT = "lumina:saved-loker";
export const SAVED_MAX = 200;

const SavedLokerSchema = z
  .object({
    id: z.string().min(1).max(2048),
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    location: z.string().max(200).nullable(),
    salaryText: z.string().max(120).nullable(),
    sentinelStatus: z.enum(["clean", "suspicious", "rejected"]),
    luminaRisk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
    savedAt: z.string(),
  })
  .strict();

const SavedListSchema = z.array(SavedLokerSchema).max(SAVED_MAX);

export function loadSaved(): SavedLoker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = SavedListSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function writeSaved(list: readonly SavedLoker[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, SAVED_MAX)));
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function snapshotOf(posting: LokerView): SavedLoker {
  return {
    id: posting.urlKey,
    title: posting.title,
    company: posting.company,
    location: posting.location,
    salaryText: posting.salaryText,
    sentinelStatus: posting.sentinelStatus,
    luminaRisk: posting.luminaRisk,
    savedAt: new Date().toISOString(),
  };
}

export function toggleSaved(posting: LokerView): SavedLoker[] {
  const current = loadSaved();
  const exists = current.some((item) => item.id === posting.urlKey);
  const next = exists
    ? current.filter((item) => item.id !== posting.urlKey)
    : [snapshotOf(posting), ...current].slice(0, SAVED_MAX);
  writeSaved(next);
  return next;
}

export function removeSaved(id: string): SavedLoker[] {
  const next = loadSaved().filter((item) => item.id !== id);
  writeSaved(next);
  return next;
}
```

- [ ] **Step 4: Run the store test to verify it passes**

Run: `npm test -- src/lib/loker/saved.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the hook**

`src/lib/loker/use-saved.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadSaved,
  removeSaved,
  SAVED_EVENT,
  toggleSaved,
} from "@/lib/loker/saved";
import type { LokerView, SavedLoker } from "@/lib/loker/types";

function subscribe(onChange: () => void) {
  window.addEventListener(SAVED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SAVED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * `loaded` is false until the first post-mount read. `/profil` uses it to show
 * a skeleton instead of flashing "belum ada" over a store it has not read yet.
 */
export function useSavedLoker() {
  const [saved, setSaved] = useState<SavedLoker[] | null>(null);

  useEffect(() => {
    const read = () => setSaved(loadSaved());
    read();
    return subscribe(read);
  }, []);

  const toggle = useCallback((posting: LokerView) => {
    toggleSaved(posting);
  }, []);

  const remove = useCallback((id: string) => {
    removeSaved(id);
  }, []);

  return {
    saved: saved ?? [],
    loaded: saved !== null,
    toggle,
    remove,
  };
}
```

- [ ] **Step 6: Write the failing profile test**

`src/components/profil/profil-loker.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilLoker } from "@/components/profil/profil-loker";
import { toggleSaved } from "@/lib/loker/saved";
import type { LokerView } from "@/lib/loker/types";

function posting(): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: "Rp10-15 jt",
    tags: [],
    description: "Membangun antarmuka.",
    applyUrl: null,
    source: "Jobstreet",
    postedAt: null,
    fetchedAt: "2026-11-09T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("ProfilLoker", () => {
  it("shows the honest empty state", async () => {
    render(<ProfilLoker />);
    expect(
      await screen.findByText(/belum ada lowongan tersimpan/i),
    ).toBeInTheDocument();
  });

  it("lists a saved posting and removes it", async () => {
    toggleSaved(posting());
    const user = userEvent.setup();
    render(<ProfilLoker />);

    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Sentinel: bersih/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /hapus frontend engineer/i }),
    );
    expect(screen.queryByText("Frontend Engineer")).not.toBeInTheDocument();
    expect(
      screen.getByText(/belum ada lowongan tersimpan/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the profile test to verify it fails**

Run: `npm test -- src/components/profil/profil-loker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `src/components/profil/profil-loker.tsx`**

```tsx
"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Risk } from "@/lib/contracts/score";
import { useSavedLoker } from "@/lib/loker/use-saved";

const SENTINEL_LABEL = {
  clean: "bersih",
  suspicious: "mencurigakan",
  rejected: "ditolak",
} as const;

const RISK_LABEL: Record<Risk, string> = {
  bersih: "bersih",
  rendah: "rendah",
  mencurigakan: "mencurigakan",
  tinggi: "tinggi",
};

/** The `/profil` section. Saving never requires an account. */
export function ProfilLoker() {
  const { saved, loaded, remove } = useSavedLoker();

  if (!loaded) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (saved.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-dim text-sm">
          Belum ada lowongan tersimpan di perangkat ini.
        </p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/companion">Cari lowongan</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {saved.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-sm text-txt">{item.title}</p>
            <p className="truncate text-dim text-xs">
              {[item.company, item.location, item.salaryText]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge
                variant={item.sentinelStatus === "clean" ? "outline" : "secondary"}
              >
                Sentinel: {SENTINEL_LABEL[item.sentinelStatus]}
              </Badge>
              <Badge
                variant={
                  item.luminaRisk === "mencurigakan" ||
                  item.luminaRisk === "tinggi"
                    ? "secondary"
                    : "outline"
                }
              >
                Lumina: {RISK_LABEL[item.luminaRisk]}
              </Badge>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(item.id)}
            aria-label={`Hapus ${item.title} dari simpanan`}
          >
            <Trash2 aria-hidden /> Hapus
          </Button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 9: Wire the section into `/profil`**

In `src/components/profil/profil-view.tsx`, import:

```tsx
import { ProfilLoker } from "@/components/profil/profil-loker";
```

Add a second card after the "Kemajuan belajar" card:

```tsx
      <Card>
        <CardHeader>
          <CardTitle>Lowongan tersimpan</CardTitle>
          <CardDescription>
            Lowongan yang kamu simpan di perangkat ini, bukan di akun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilLoker />
        </CardContent>
      </Card>
```

- [ ] **Step 10: Run the saved-jobs suites**

Run: `npm test -- src/lib/loker/saved.test.ts src/components/profil/profil-loker.test.tsx src/components/profil/profil-view.test.tsx`
Expected: PASS.

- [ ] **Step 11: Commit (deferred)**

```bash
git add src/lib/loker/saved.ts src/lib/loker/use-saved.ts \
  src/lib/loker/saved.test.ts src/components/profil/profil-loker.tsx \
  src/components/profil/profil-loker.test.tsx \
  src/components/profil/profil-view.tsx
git commit -m "feat(loker): save postings on the device and list them in profil"
```

---

## Task 22: Wire the tool into the chat and the composer chip

**Files:**
- Modify: `src/components/companion/companion-chat.tsx`
- Modify: `src/components/companion/composer.tsx`
- Test: `src/components/companion/companion-chat.test.tsx`

**Interfaces:**
- Consumes: `LokerTool` (Task 20), `requestToolSummary` (Task 17), `filterPostings` (Task 10), `useSavedLoker` (Task 21), `AgentStage`/`STAGE_LABEL` (Task 18)
- Produces: `Turn.tool?: LokerTurnTool`
- Produces: `<Composer onSearchJobs={...} />`
- Produces: the chip path (`openJobSearch`) and the model path (tool call → card → summary)

- [ ] **Step 1: Add the failing chat tests**

At the top of `src/components/companion/companion-chat.test.tsx`, after the
`next/link` mock, add:

```tsx
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
```

Append at the end of the file:

```tsx
describe("CompanionChat · job search", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    if (realFetch) {
      globalThis.fetch = realFetch;
    } else {
      delete (globalThis as { fetch?: unknown }).fetch;
    }
    jest.restoreAllMocks();
  });

  function posting(over: Partial<LokerView> = {}): LokerView {
    return {
      urlKey: "https://example.com/1",
      title: "Frontend Engineer",
      company: "PT Maju",
      location: "Jakarta",
      salaryMin: 10_000_000,
      salaryMax: 15_000_000,
      salaryText: "Rp10-15 jt",
      tags: ["React"],
      description: "Membangun antarmuka React.",
      applyUrl: "https://example.com/1",
      source: "Jobstreet",
      postedAt: "2026-11-01",
      fetchedAt: "2026-11-09T00:00:00.000Z",
      companyEmail: "hr@maju.co.id",
      domainAgeDays: 400,
      employerKnown: true,
      sentinelStatus: "clean",
      sentinelFlags: [],
      trustScore: 100,
      trustLevel: "high",
      luminaScore: 0,
      luminaRisk: "bersih",
      luminaSignals: [],
      ...over,
    };
  }

  const corpus: LokerCorpus = {
    postings: [posting()],
    total: 1,
    capped: false,
  };

  it("renders the card and the summary when the model calls job_search", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/companion/answer")) {
        return new Response(
          JSON.stringify({
            ok: true,
            text: "",
            toolCalls: [
              {
                id: "call-1",
                name: "job_search",
                arguments: { query: "React" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/api/companion/tools/summary")) {
        return new Response(
          JSON.stringify({ ok: true, text: "Ada satu lowongan React." }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CompanionChat corpus={corpus} />);
    await enterMessage(user, "cari lowongan React");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
    expect(
      await screen.findByText("Ada satu lowongan React."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("agent-job-search")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("opens the card from the chip without calling the model", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<CompanionChat corpus={corpus} />);

    await user.click(screen.getByRole("button", { name: /cari lowongan/i }));

    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/ada satu lowongan react/i),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-job-search")).toBeInTheDocument();
  });
});
```

Add the type import at the top of the test file:

```tsx
import type { LokerCorpus, LokerView } from "@/lib/loker/types";
```

- [ ] **Step 2: Run the chat tests to verify they fail**

Run: `npm test -- src/components/companion/companion-chat.test.tsx`
Expected: FAIL — `CompanionChat` does not render a job-search card.

- [ ] **Step 3: Add the turn type and imports**

In `src/components/companion/companion-chat.tsx`, add:

```ts
import { LokerTool } from "@/components/companion/loker-tool";
import { requestToolSummary } from "@/lib/companion/tool-client";
import { filterPostings } from "@/lib/loker/search";
import type { LokerCorpus, LokerSearchArgs } from "@/lib/loker/types";
import { useSavedLoker } from "@/lib/loker/use-saved";
```

After the `Turn` interface, add:

```ts
interface LokerTurnTool {
  args: LokerSearchArgs;
  count: number;
  total: number;
  capped: boolean;
  summary: string | null;
  summaryState: "idle" | "running" | "done" | "failed";
}
```

Add the field to `Turn`:

```ts
  /** The job-search card for this turn, when the tool ran. */
  tool?: LokerTurnTool;
```

Add a module-level default and fallback after `newSession()`:

```ts
const EMPTY_CORPUS: LokerCorpus = {
  postings: [],
  total: 0,
  capped: false,
};

/**
 * Deterministic copy when the summary route is offline or unconfigured. It
 * states the count and nothing the card does not already show.
 */
function summaryFallback(count: number): string {
  if (count === 0) {
    return "Tidak ada lowongan yang cocok dengan saringan itu.";
  }
  return `${count} lowongan cocok dengan saringan itu. Buka kartu untuk melihat dua penilaian tiap lowongan.`;
}
```

- [ ] **Step 4: Accept the corpus prop and the saved hook**

Change the signature:

```tsx
export function CompanionChat({
  session = null,
  initialPanel,
  corpus = EMPTY_CORPUS,
}: {
  session?: CompanionSession | null;
  /** Set when another surface links straight into the detector overview. */
  initialPanel?: "agen";
  /** The capped cumulative scan snapshot; the client filters it locally. */
  corpus?: LokerCorpus;
}) {
```

Add near the other state:

```ts
  const { saved, toggle: toggleSaved } = useSavedLoker();
```

- [ ] **Step 5: Run the tool after the model answers**

Replace the model branch in `send`:

```ts
        if (answer.outcome === "model") {
          finish(answer.text, "model");
        } else {
          finish(
            composeAnswerFallback(lane),
            "template",
            answer.outcome as VoiceOutcome,
          );
        }
```

with:

```ts
        if (answer.outcome === "model") {
          finish(answer.text, "model");

          const call = answer.toolCalls[0];
          if (!call) return;

          const toolStarted = performance.now();
          const matches = filterPostings(corpus.postings, call.arguments);
          const toolMs = performance.now() - toolStarted;

          const searchStage: AgentStage = {
            id: "job-search",
            ...STAGE_LABEL["job-search"],
            status: "selesai",
            findings: 0,
            ms: toolMs,
            note: `${matches.length} lowongan cocok`,
          };

          patchCompanion((turn) => ({
            ...turn,
            tool: {
              args: call.arguments,
              count: matches.length,
              total: corpus.total,
              capped: corpus.capped,
              summary: null,
              summaryState: "running",
            },
            trace: turn.trace
              ? {
                  stages: [...turn.trace.stages, searchStage],
                  totalMs: turn.trace.totalMs + toolMs,
                }
              : { stages: [searchStage], totalMs: toolMs },
          }));

          /*
           * Phase 2 carries titles, companies, verdicts, and a count. The
           * query, descriptions, apply URLs, and the saved list never enter
           * this object, so the privacy boundary is the payload.
           */
          const summaryControl = new AbortController();
          const summaryTimer = setTimeout(
            () => summaryControl.abort(),
            21000,
          );
          let summary: string | null = null;
          try {
            summary = await requestToolSummary(
              {
                count: matches.length,
                postings: matches.slice(0, 20).map((item) => ({
                  title: item.title,
                  company: item.company,
                  sentinelStatus: item.sentinelStatus,
                  luminaRisk: item.luminaRisk,
                })),
              },
              summaryControl.signal,
            );
          } finally {
            clearTimeout(summaryTimer);
          }

          const sentence = summary ?? summaryFallback(matches.length);

          patchCompanion((turn) => ({
            ...turn,
            tool: turn.tool
              ? {
                  ...turn.tool,
                  summary: sentence,
                  summaryState: summary ? "done" : "failed",
                }
              : undefined,
          }));

          /*
           * The summary is a second companion bubble only while the tool turn
           * is still the last thing in the thread. If the reader already sent
           * another message, appending it would answer a question they moved
           * past.
           */
          const summaryTurn: Turn = {
            id: id(),
            role: "companion",
            text: sentence,
            at: stamp,
          };
          setSessions((prev) =>
            prev.map((item) => {
              if (item.id !== target) return item;
              const last = item.turns[item.turns.length - 1];
              if (last?.id !== companionId) return item;
              return { ...item, turns: [...item.turns, summaryTurn] };
            }),
          );
          return;
        }

        finish(
          composeAnswerFallback(lane),
          "template",
          answer.outcome as VoiceOutcome,
        );
```

Add `corpus` to the `send` dependency array:

```ts
    [active?.turns, activeId, busy, corpus, latestExplanation, latestResult],
```

- [ ] **Step 6: Add the chip path**

After `send`, before `startNew`, add:

```ts
  /**
   * The chip path: open the card with no filters and no model call.
   *
   * It still records a `job-search` stage, because the trace is the honest
   * record of what ran; it simply has no detector and no language stage. The
   * summary is skipped on purpose.
   */
  const openJobSearch = React.useCallback(() => {
    if (busy) return;
    const target = activeId;
    if (target === undefined) return;

    const stamp = new Date().toISOString();
    const started = performance.now();
    const matches = filterPostings(corpus.postings, { query: "" });
    const toolMs = performance.now() - started;

    const searchStage: AgentStage = {
      id: "job-search",
      ...STAGE_LABEL["job-search"],
      status: "selesai",
      findings: 0,
      ms: toolMs,
      note: `${matches.length} lowongan cocok`,
    };

    const userTurn: Turn = {
      id: id(),
      role: "user",
      text: "Cari lowongan",
      at: stamp,
      lane: "obrolan",
    };
    const cardTurn: Turn = {
      id: id(),
      role: "companion",
      text: "",
      at: stamp,
      tool: {
        args: { query: "" },
        count: matches.length,
        total: corpus.total,
        capped: corpus.capped,
        summary: null,
        summaryState: "idle",
      },
      trace: { stages: [searchStage], totalMs: toolMs },
    };

    setSessions((prev) =>
      prev.map((item) =>
        item.id === target
          ? {
              ...item,
              title: item.turns.length === 0 ? "Cari lowongan" : item.title,
              time: stamp.slice(11, 16),
              updatedAt: new Date(stamp).getTime(),
              turns: [...item.turns, userTurn, cardTurn],
            }
          : item,
      ),
    );
  }, [activeId, busy, corpus]);
```

- [ ] **Step 7: Render the card in the transcript**

In the companion branch, after the `turn.text.length > 0` block and before the
`turn.lane === "tanya"` block, add:

```tsx
                      {turn.tool ? (
                        <LokerTool
                          corpus={corpus}
                          initialArgs={turn.tool.args}
                          summaryState={turn.tool.summaryState}
                          canRefresh={session !== null}
                          saved={saved}
                          onToggleSave={toggleSaved}
                        />
                      ) : null}
```

- [ ] **Step 8: Add the composer chip**

In `src/components/companion/composer.tsx`, add `Briefcase` to the lucide
import, then add the prop:

```ts
export function Composer({
  onSubmit,
  busy = false,
  placeholder = "Tempel pesan atau tulis pertanyaanmu…",
  submitLabel = "Kirim",
  autoFocus = false,
  className,
  onSearchJobs,
}: {
  /** Called with the typed text and the attachments for this turn. */
  onSubmit: (text: string, attachments: Attachment[]) => void;
  busy?: boolean;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  className?: string;
  /** Opens the job-search card with no query; no model call. */
  onSearchJobs?: () => void;
}) {
```

In the left toolbar group, after the image `Button` and before the
`Enter mengirim` hint, add:

```tsx
              {onSearchJobs ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSearchJobs}
                  aria-label="Cari lowongan"
                  className="h-11 shrink-0 rounded-[8px] border border-transparent bg-chip px-2.5 text-ink-mute text-[11px] hover:bg-chip-hover hover:text-ink sm:h-[29px]"
                >
                  <Briefcase
                    aria-hidden
                    strokeWidth={1.6}
                    className="size-3.5"
                  />
                  <span className="hidden sm:inline">Cari lowongan</span>
                  <span className="sm:hidden">Cari</span>
                </Button>
              ) : null}
```

Pass the handler to both composer instances in `companion-chat.tsx`:

```tsx
                    onSubmit={(text, attachments) => send(text, attachments)}
                    busy={busy}
                    onSearchJobs={openJobSearch}
```

- [ ] **Step 9: Run the chat, composer, and tool suites**

Run: `npm test -- src/components/companion/companion-chat.test.tsx src/components/companion/loker-tool.test.tsx`
Expected: PASS.

- [ ] **Step 10: Commit (deferred)**

```bash
git add src/components/companion/companion-chat.tsx \
  src/components/companion/composer.tsx \
  src/components/companion/companion-chat.test.tsx
git commit -m "feat(loker): wire job search into the companion chat and composer"
```

---

## Task 23: Docs, deployment, and the final gate

**Files:**
- Create: `docs/loker-tool.md`
- Modify: `AGENTS.md`
- Modify: `Dockerfile`
- Modify: `docs/deploy.md`

**Interfaces:**
- Produces: the operator-facing feature doc and the deployment surface for `scanner/`
- Verifies: `npm run verify` is green with every earlier task applied

- [ ] **Step 1: Write `docs/loker-tool.md`**

````markdown
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
   row before the audit. A row whose adapter or RDAP lookup fails is `dropped`,
   never inserted with empty audit data.
c. `url_key` is the engine's dedupe key; a re-scan upserts and refreshes
   `fetched_at` instead of duplicating rows.
d. The visible corpus is cumulative, newest `fetched_at` first, capped by the
   RSC loader. The card prints the real count when the cap applies.

## Data model

`migrations/002_loker.sql` creates `loker_scan_runs`, `loker_postings`, and
`loker_domain_cache`. The app creates no tables. Run `npm run db:migrate`
before starting a build that includes this feature.

`company_email`, `domain_age_days`, and `employer_known` are `not null`: a row
that cannot fill them is not inserted. `lumina_signals` stores
`{label, weight}[]` only — no evidence quotes.

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
holds it until the background job finishes. A second trigger gets `409`, not a
second scan. The child process has a five-minute timeout and a sanitized
environment; no shell interpolation is used.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `LOKER_SCAN_DATA_DIR` | `<cwd>/.scan-data` | scanner data root (portals, pipeline, reports) |
| `LUMINA_LLM_URL`, `LUMINA_LLM_MODEL`, `LUMINA_LLM_KEY` | — | OpenAI-compatible endpoint; unset means the tool still works from the cached corpus and the summary falls back to deterministic copy |

The data root must be writable by the app user. In the container it is
`/app/.scan-data`, created and owned by UID 1001.

## Operations

a. First deploy: `npm run db:migrate`, then start the app. The first signed-in
   refresh seeds `portals.yml` and the engine skeletons.
b. A scan runs in the background; the card polls status and calls
   `router.refresh()` when the run settles.
c. The tool always reads the last completed corpus, so a running scan never
   blocks a search.
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
````

- [ ] **Step 2: Update `AGENTS.md`**

In the env list, after `LUMINA_AI_GLOBAL_LIMIT`, add:

```markdown
- `LOKER_SCAN_DATA_DIR` — akar data pemindai lowongan (default `<cwd>/.scan-data`;
  di container `/app/.scan-data`). Harus bisa ditulis proses aplikasi.
```

In the Deploy section, after the standalone sentence, add:

```markdown
`scanner/` adalah engine career-ops yang di-vendor utuh dan dijalankan sebagai
subprocess; `Dockerfile` menyalinnya dan membuat `/app/.scan-data` milik UID
1001. Migrasi `002_loker.sql` ikut `npm run db:migrate`; aplikasi tidak membuat
tabel.
```

In the routes table, add:

```markdown
| `api/loker/scan` | route handler | — | mulai pindai (sesi + rate limit + advisory lock) |
| `api/loker/scan/status` | route handler | — | status run terakhir; `204` bila belum ada |
| `api/companion/tools/summary` | route handler | — | ringkasan fase 2 (tanpa query/deskripsi) |
```

In the layout tree, add under `src/app/api/`:

```markdown
│   │   ├── loker/            scan + scan/status
│   │   └── companion/tools/  summary
```

and under `src/lib/`:

```markdown
│   ├── loker/                scanner bridge, boards, audit, store, search
```

and under `src/components/companion/`:

```markdown
│   │   ├── loker-tool.tsx    kartu pencarian lowongan
│   │   └── loker-card.tsx    satu lowongan + dua penilaian
```

and at the repo root:

```markdown
├── scanner/                  engine career-ops yang di-vendor (jangan diedit)
```

In the stream table, after the D row, add:

```markdown
| Loker (pasca-submisi) | `scanner/`, `lib/loker/`, `api/loker/`, `api/companion/tools/`, `components/companion/loker-*`, `migrations/002_loker.sql` | engine skor pesan, konten modul, PDF |
```

Add a note under the table:

```markdown
`StageId` mendapat entri aditif `"job-search"` untuk jejak agen; `AgentId` tidak
berubah. Perubahan ini terasa di panel bukti bersama, jadi sebutkan di PR.
```

- [ ] **Step 3: Update the `Dockerfile`**

Before `USER nextjs`, add:

```dockerfile
# The vendored scanner and its writable data root. The engine is a child
# process under the same non-root user; it needs read access to `scanner/` and
# write access to `.scan-data`.
COPY --from=builder --chown=nextjs:nodejs /app/scanner ./scanner
RUN mkdir -p /app/.scan-data && chown nextjs:nodejs /app/.scan-data
ENV LOKER_SCAN_DATA_DIR=/app/.scan-data
```

- [ ] **Step 4: Add the operator note to `docs/deploy.md`**

Under "Updates and rollback", add:

```markdown
### Loker scanner

The image carries `scanner/` and creates `/app/.scan-data` owned by UID 1001.
`LOKER_SCAN_DATA_DIR` defaults to that path; do not mount it read-only. The
loker tables arrive through `npm run db:migrate` (`002_loker.sql`), like every
other migration. A scan is triggered from the signed-in companion and runs in
the background; no extra service or volume is required.
```

- [ ] **Step 5: Run the full gate**

Run:

```bash
npm run verify
```

Expected: typecheck, Biome, Jest, and the production build all pass. If the
build fails on a `cacheComponents` route config, remove any `export const
runtime`/`dynamic` the change added; this feature needs neither.

- [ ] **Step 6: Manual smoke check**

With `DATABASE_URL` pointing at a migrated database and the dev server running:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/loker/scan/status
```

Expected: `204` before any scan, `200` after one. Open `/companion`, tap
"Cari lowongan", and confirm the card renders at 380 px with no horizontal
scroll and both verdicts on each posting.

- [ ] **Step 7: Commit (deferred)**

```bash
git add docs/loker-tool.md docs/deploy.md AGENTS.md Dockerfile
git commit -m "docs(loker): document the job-search tool and its deployment"
```

---

<!-- CHUNK-END -->
