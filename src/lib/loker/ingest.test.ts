/** @jest-environment node */
import { type IngestDeps, ingestScan } from "@/lib/loker/ingest";
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
        {
          label: "Tidak ada pola penipuan",
          weight: 0,
          evidence: "x",
          agent: "message",
        },
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
          {
            label: "Meminta OTP",
            weight: 0.9,
            evidence: "kirim OTP kamu",
            agent: "message",
          },
        ],
        modus: "otp",
        advice: [],
        relatedModule: null,
        hardOverride: false,
      }),
    });
    await ingestScan([row()], 1, d);
    const saved = (d as IngestDeps & { saved: PostingRow[] }).saved;
    expect(saved[0]?.luminaSignals).toEqual([
      { label: "Meminta OTP", weight: 0.9 },
    ]);
    expect(JSON.stringify(saved[0])).not.toContain("kirim OTP kamu");
  });

  it("drops a row whose domain age could not be resolved", async () => {
    const out = await ingestScan(
      [row()],
      1,
      deps({
        domainAge: jest
          .fn()
          .mockResolvedValue({ status: "error", ageDays: null }),
      }),
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
