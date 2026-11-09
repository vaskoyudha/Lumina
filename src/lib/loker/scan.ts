import "server-only";
import { type ChildProcess, spawn as nodeSpawn } from "node:child_process";
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
 * The engine is a vendored third-party program. It receives the process facts
 * it needs and nothing else — no database URL, no OAuth or model keys.
 */
function childEnv(root: string): NodeJS.ProcessEnv {
  const allow = [
    "PATH",
    "HOME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "TZ",
    "NODE_ENV",
    "NODE_OPTIONS",
  ];
  const env = {} as NodeJS.ProcessEnv;
  for (const key of allow) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  env.CAREER_OPS_ROOT = root;
  env.CAREER_OPS_TRACKER = path.join(root, "applications.md");
  return env;
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

  try {
    await bootstrapScanRoot(root);
  } catch {
    return { ok: false, reason: "fatal", exitCode: null };
  }

  return new Promise<ScanOutcome>((resolve) => {
    let settled = false;
    let stdout = "";
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (outcome: ScanOutcome) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };

    let child: ChildProcess;
    try {
      child = spawn(process.execPath, buildScanArgs(since), {
        cwd: process.cwd(),
        env: childEnv(root),
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      finish({ ok: false, reason: "fatal", exitCode: null });
      return;
    }

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
    child.on("close", (code) => finish(parseScanReceipt(stdout, code)));
  });
}
