/** @jest-environment node */
jest.mock("next/server", () => ({ connection: jest.fn() }));
jest.mock("@/lib/loker/store", () => ({
  latestScanRun: jest.fn(),
  countPostings: jest.fn(),
}));

import { GET } from "@/app/api/loker/scan/status/route";
import { countPostings, latestScanRun } from "@/lib/loker/store";

describe("GET /api/loker/scan/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(countPostings).mockResolvedValue(0);
  });

  it("returns 204 before any run exists", async () => {
    jest.mocked(latestScanRun).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(204);
  });

  it("returns the latest run plus the live corpus size with no-store", async () => {
    jest.mocked(latestScanRun).mockResolvedValue({
      status: "ok",
      found: 40,
      added: 26,
      dropped: 14,
      finishedAt: "2026-11-09T00:00:00.000Z",
    });
    jest.mocked(countPostings).mockResolvedValue(118);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      status: "ok",
      added: 26,
      postings: 118,
    });
  });

  it("still reports the run when the corpus count fails", async () => {
    jest.mocked(latestScanRun).mockResolvedValue({
      status: "running",
      found: 0,
      added: 0,
      dropped: 0,
      finishedAt: null,
    });
    jest.mocked(countPostings).mockRejectedValue(new Error("db down"));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "running",
      postings: 0,
    });
  });
});
