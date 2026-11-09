import {
  type InboxJobShape,
  parseInbox,
  splitLines,
} from "@/lib/loker/pipeline-table";
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
  return ["scanner/scan.mjs", "--json", "--quiet", "--since", String(since)];
}

export { parseInbox, normalisasiKunciUrl, splitLines };
export type { InboxJobShape };
