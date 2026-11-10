/** @jest-environment node */
jest.mock("@/lib/loker/store", () => ({ latestScanRun: jest.fn() }));
jest.mock("@/lib/loker/start", () => ({
  acquireScanLease: jest.fn(),
  runLeasedScan: jest.fn(),
}));

import {
  PREWARM_INTERVAL_MS,
  PREWARM_RETRY_MS,
  type PrewarmDeps,
  prewarmIntervalMs,
  prewarmOnce,
  shouldPrewarm,
  startPrewarm,
} from "@/lib/loker/prewarm";

const HOUR = 60 * 60 * 1_000;
const NOW = Date.parse("2026-11-10T12:00:00.000Z");

function finished(hoursAgo: number, status: "ok" | "failed" = "ok") {
  return {
    status,
    finishedAt: new Date(NOW - hoursAgo * HOUR).toISOString(),
  };
}

describe("shouldPrewarm", () => {
  it("is disabled by a zero interval", () => {
    expect(shouldPrewarm(null, NOW, 0)).toBe(false);
  });

  it("starts when no run has ever been recorded", () => {
    expect(shouldPrewarm(null, NOW, PREWARM_INTERVAL_MS)).toBe(true);
  });

  it("defers to the advisory lock for a run marked in progress", () => {
    expect(
      shouldPrewarm(
        { status: "running", finishedAt: null },
        NOW,
        PREWARM_INTERVAL_MS,
      ),
    ).toBe(true);
  });

  it("waits for the full interval after a successful run", () => {
    expect(shouldPrewarm(finished(5), NOW, PREWARM_INTERVAL_MS)).toBe(false);
    expect(shouldPrewarm(finished(7), NOW, PREWARM_INTERVAL_MS)).toBe(true);
  });

  it("retries a failed run after the shorter retry interval", () => {
    const failed = finished(0.5, "failed");
    expect(shouldPrewarm(failed, NOW, PREWARM_INTERVAL_MS)).toBe(true);
    expect(
      shouldPrewarm(finished(0.1, "failed"), NOW, PREWARM_INTERVAL_MS),
    ).toBe(false);
    expect(PREWARM_RETRY_MS).toBeLessThan(PREWARM_INTERVAL_MS);
  });

  it("treats clock skew and unparseable timestamps as not stale", () => {
    expect(shouldPrewarm(finished(-1), NOW, PREWARM_INTERVAL_MS)).toBe(false);
    expect(
      shouldPrewarm(
        { status: "ok", finishedAt: "not-a-date" },
        NOW,
        PREWARM_INTERVAL_MS,
      ),
    ).toBe(false);
  });
});

describe("prewarmIntervalMs", () => {
  it("defaults to six hours", () => {
    expect(prewarmIntervalMs({})).toBe(PREWARM_INTERVAL_MS);
  });

  it("accepts zero as an explicit off switch", () => {
    expect(prewarmIntervalMs({ LOKER_PREWARM_INTERVAL_MS: "0" })).toBe(0);
  });

  it("parses an override and ignores garbage", () => {
    expect(prewarmIntervalMs({ LOKER_PREWARM_INTERVAL_MS: "900000" })).toBe(
      900_000,
    );
    expect(prewarmIntervalMs({ LOKER_PREWARM_INTERVAL_MS: "soon" })).toBe(
      PREWARM_INTERVAL_MS,
    );
    expect(prewarmIntervalMs({ LOKER_PREWARM_INTERVAL_MS: "-5" })).toBe(
      PREWARM_INTERVAL_MS,
    );
  });
});

describe("prewarmOnce", () => {
  function deps(over: Partial<PrewarmDeps> = {}): PrewarmDeps {
    return {
      latest: jest.fn().mockResolvedValue(null),
      acquire: jest.fn().mockResolvedValue({
        ok: true,
        lease: { runId: 7, release: jest.fn() },
      }),
      run: jest.fn().mockResolvedValue(undefined),
      now: () => NOW,
      ...over,
    };
  }

  it("starts a scan without waiting for the crawl", async () => {
    const run = jest.fn(() => new Promise<void>(() => {}));
    const d = deps({ run });
    await expect(prewarmOnce(d, PREWARM_INTERVAL_MS)).resolves.toBe("started");
    expect(d.acquire).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ runId: 7 }));
  });

  it("does not acquire the lease when the corpus is fresh", async () => {
    const d = deps({
      latest: jest.fn().mockResolvedValue(finished(1)),
    });
    await expect(prewarmOnce(d, PREWARM_INTERVAL_MS)).resolves.toBe("skipped");
    expect(d.acquire).not.toHaveBeenCalled();
  });

  it("reports busy, not skipped, when another scan holds the lock", async () => {
    const d = deps({
      acquire: jest.fn().mockResolvedValue({ ok: false, reason: "running" }),
    });
    await expect(prewarmOnce(d, PREWARM_INTERVAL_MS)).resolves.toBe("busy");
    expect(d.run).not.toHaveBeenCalled();
  });

  it("skips when the database read fails", async () => {
    const d = deps({ latest: jest.fn().mockRejectedValue(new Error("db")) });
    await expect(prewarmOnce(d, PREWARM_INTERVAL_MS)).resolves.toBe("skipped");
  });
});

describe("startPrewarm", () => {
  it("does not schedule anything when the interval is zero", () => {
    expect(startPrewarm(0)).toBe(false);
  });
});
