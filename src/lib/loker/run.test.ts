/** @jest-environment node */
import type { ScanOutcome } from "@/lib/loker/receipt";
import { type RunDeps, runScanJob } from "@/lib/loker/run";

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

    const rows = ((d.ingest as jest.Mock).mock.calls[0] as unknown[])[0] as {
      url: string;
    }[];
    // The receipt URL carries `?utm_source=x`; normalisasiKunciUrl makes it
    // match pipeline row 2 (`.../job/2`). The raw pipeline URLs are what get
    // ingested.
    expect(rows.map((r) => r.url)).toEqual([
      "https://id.jobstreet.com/job/1",
      "https://id.jobstreet.com/job/2",
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
    const d = deps({
      readPipeline: jest.fn().mockRejectedValue(new Error("ENOENT")),
    });
    await runScanJob(9, d);
    expect(d.ingest).toHaveBeenCalledWith([], 9, expect.anything());
    expect(d.finish).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ status: "ok", added: 2 }),
    );
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
