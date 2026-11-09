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
  type PostingRow,
  readDomainCache,
  startScanRun,
  upsertPosting,
  writeDomainCache,
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
    expect(await latestScanRun()).toMatchObject({
      status: "running",
      found: 0,
    });
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
