/** @jest-environment node */
import type { ScanOutcome } from "@/lib/loker/receipt";
import { type RunDeps, runScanJob, scanWindowDays } from "@/lib/loker/run";

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
    keys: jest.fn().mockResolvedValue(new Set<string>()),
    ingest: jest.fn().mockResolvedValue({ added: 2, dropped: 0 }),
    finish: jest.fn().mockResolvedValue(undefined),
    window: jest.fn().mockResolvedValue(30),
    ...over,
  };
}

describe("scanWindowDays", () => {
  const now = Date.parse("2026-11-10T12:00:00.000Z");

  it("asks for the full month before the first successful run", () => {
    expect(scanWindowDays(null, now)).toBe(30);
    expect(scanWindowDays("not-a-date", now)).toBe(30);
    expect(scanWindowDays("2099-01-01T00:00:00.000Z", now)).toBe(30);
  });

  it("only asks for the days since the last successful run", () => {
    expect(scanWindowDays("2026-11-10T06:00:00.000Z", now)).toBe(2);
    expect(scanWindowDays("2026-11-08T12:00:00.000Z", now)).toBe(3);
  });

  it("never exceeds the scanner's own default", () => {
    expect(scanWindowDays("2026-01-01T00:00:00.000Z", now)).toBe(30);
  });
});

describe("runScanJob", () => {
  it("ingests this run's rows plus the unimported backlog, then records an ok run", async () => {
    const d = deps();
    await runScanJob(9, d);

    const rows = ((d.ingest as jest.Mock).mock.calls[0] as unknown[])[0] as {
      url: string;
    }[];
    // The receipt URL carries `?utm_source=x`; normalisasiKunciUrl makes it
    // match pipeline row 2 (`.../job/2`). The raw pipeline URLs are what get
    // ingested; row 3 is the backlog because `keys` is empty.
    expect(rows.map((r) => r.url)).toEqual([
      "https://id.jobstreet.com/job/1",
      "https://id.jobstreet.com/job/2",
      "https://id.jobstreet.com/job/3",
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

  it("does not re-ingest rows already stored", async () => {
    const d = deps({
      keys: jest
        .fn()
        .mockResolvedValue(new Set(["https://id.jobstreet.com/job/3"])),
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

  it("does not re-fetch a receipt URL the corpus already holds", async () => {
    const d = deps({
      keys: jest
        .fn()
        .mockResolvedValue(new Set(["https://id.jobstreet.com/job/1"])),
    });
    await runScanJob(9, d);
    const rows = ((d.ingest as jest.Mock).mock.calls[0] as unknown[])[0] as {
      url: string;
    }[];
    expect(rows.map((r) => r.url)).toEqual([
      "https://id.jobstreet.com/job/2",
      "https://id.jobstreet.com/job/3",
    ]);
  });

  it("passes the incremental window to the scanner", async () => {
    const d = deps({ window: jest.fn().mockResolvedValue(3) });
    await runScanJob(9, d);
    expect(d.scan).toHaveBeenCalledWith({ since: 3 });
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
    const d = deps({
      readPipeline: jest.fn().mockRejectedValue(new Error("ENOENT")),
      ingest: jest.fn().mockResolvedValue({ added: 0, dropped: 0 }),
    });
    await runScanJob(9, d);
    expect(d.ingest).toHaveBeenCalledWith([], 9, expect.anything());
    expect(d.finish).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ status: "ok", added: 0 }),
    );
  });

  it("skips processed and placeholder rows in the backlog", async () => {
    const pipeline = `- [ ] https://id.jobstreet.com/job/1 | PT Maju | Frontend Engineer
- [x] https://id.jobstreet.com/job/9 | PT Lama | Old Role
- [ ] N/A | PT Placeholder | Ghost Role
`;
    const d = deps({
      scan: jest.fn().mockResolvedValue({
        ...RECEIPT,
        receipt: { ...RECEIPT.receipt, added: 0, added_urls: [] },
      }),
      readPipeline: jest.fn().mockResolvedValue(pipeline),
    });
    await runScanJob(9, d);
    const rows = ((d.ingest as jest.Mock).mock.calls[0] as unknown[])[0] as {
      url: string;
    }[];
    expect(rows.map((r) => r.url)).toEqual(["https://id.jobstreet.com/job/1"]);
  });

  it("never throws and never misreports when recording the run fails", async () => {
    const d = deps({
      finish: jest.fn().mockRejectedValue(new Error("db down")),
    });
    await expect(runScanJob(9, d)).resolves.toBeUndefined();
    // Called once with the true outcome — a reporting failure must not
    // downgrade a successful scan to `failed`.
    expect(d.finish).toHaveBeenCalledTimes(1);
    expect(d.finish).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ status: "ok", added: 2 }),
    );
  });
});
