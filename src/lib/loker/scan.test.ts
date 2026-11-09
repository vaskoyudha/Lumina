/** @jest-environment node */

import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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

async function waitForSpawn(spawn: jest.Mock): Promise<void> {
  for (let i = 0; i < 500; i += 1) {
    if (spawn.mock.calls.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("spawn was never called");
}

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

    await waitForSpawn(spawn);

    child.stdout.emit("data", Buffer.from(`${JSON.stringify(RECEIPT)}\n`));
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
    await waitForSpawn(spawn);
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
    await waitForSpawn(spawn);
    child.stdout.emit("data", Buffer.from(JSON.stringify(RECEIPT)));
    child.emit("close", 2);
    const out = await pending;
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.exitCode).toBe(2);
  });

  it("kills the child and reports fatal on timeout", async () => {
    const child = new FakeChild();
    const spawn = jest.fn().mockReturnValue(child);
    const pending = runScan({
      timeoutMs: 10,
      spawn: spawn as unknown as typeof import("node:child_process").spawn,
    });
    await waitForSpawn(spawn);
    const out = await pending;
    expect(out).toEqual({ ok: false, reason: "fatal", exitCode: null });
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("reports unparseable output as a failure", async () => {
    const child = new FakeChild();
    const spawn = jest.fn().mockReturnValue(child);
    const pending = runScan({
      spawn: spawn as unknown as typeof import("node:child_process").spawn,
    });
    await waitForSpawn(spawn);
    child.stdout.emit("data", Buffer.from("not json\n"));
    child.emit("close", 0);
    expect(await pending).toEqual({
      ok: false,
      reason: "unparseable",
      exitCode: 0,
    });
  });
});
