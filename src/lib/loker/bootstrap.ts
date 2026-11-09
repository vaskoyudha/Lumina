import "server-only";
import { constants } from "node:fs";
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

function isErrnoCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
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
 * Writes use exclusive creation (`wx` / `COPYFILE_EXCL`) instead of an
 * `exists()` probe, so a user who edits a file can never have it replaced and a
 * destination that is a directory still surfaces as a real error.
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
    await mkdir(path.dirname(target), { recursive: true });
    try {
      await writeFile(target, content, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (!isErrnoCode(error, "EEXIST")) throw error;
    }
  }

  const seed = path.join(scannerDir(), "portals.yml");
  if (!(await exists(seed))) {
    throw new Error(
      "scanner/portals.yml is missing; the vendored scanner copy is incomplete. Re-vendor it and track it with `git add -f scanner/portals.yml`.",
    );
  }
  const portals = path.join(root, "portals.yml");
  try {
    await copyFile(seed, portals, constants.COPYFILE_EXCL);
  } catch (error) {
    if (!isErrnoCode(error, "EEXIST")) throw error;
  }

  for (const rel of ["reports", "jds", "batch/tracker-additions"]) {
    await mkdir(path.join(root, rel), { recursive: true });
  }
}
