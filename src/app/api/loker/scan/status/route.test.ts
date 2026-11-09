/** @jest-environment node */
jest.mock("next/server", () => ({ connection: jest.fn() }));
jest.mock("@/lib/loker/store", () => ({ latestScanRun: jest.fn() }));

import { GET } from "@/app/api/loker/scan/status/route";
import { latestScanRun } from "@/lib/loker/store";

describe("GET /api/loker/scan/status", () => {
  it("returns 204 before any run exists", async () => {
    jest.mocked(latestScanRun).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(204);
  });

  it("returns the latest run with no-store", async () => {
    jest.mocked(latestScanRun).mockResolvedValue({
      status: "ok",
      found: 40,
      added: 26,
      dropped: 14,
      finishedAt: "2026-11-09T00:00:00.000Z",
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ status: "ok", added: 26 });
  });
});
