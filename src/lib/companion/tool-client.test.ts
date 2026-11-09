/** @jest-environment node */
import { requestToolSummary } from "@/lib/companion/tool-client";

const posting = {
  title: "Frontend Engineer",
  company: "PT Maju",
  sentinelStatus: "clean" as const,
  luminaRisk: "bersih" as const,
};

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("requestToolSummary", () => {
  it("returns the trimmed sentence", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        response(200, { ok: true, text: "  Ada satu lowongan.  " }),
      );
    await expect(
      requestToolSummary(
        { count: 1, postings: [posting] },
        undefined,
        fetchImpl,
      ),
    ).resolves.toBe("Ada satu lowongan.");
  });

  it("returns null on 503 and on an empty text", async () => {
    await expect(
      requestToolSummary(
        { count: 1, postings: [posting] },
        undefined,
        jest
          .fn()
          .mockResolvedValue(
            response(503, { ok: false, error: "not-configured" }),
          ),
      ),
    ).resolves.toBeNull();
    await expect(
      requestToolSummary(
        { count: 1, postings: [posting] },
        undefined,
        jest.fn().mockResolvedValue(response(200, { ok: true, text: "   " })),
      ),
    ).resolves.toBeNull();
  });

  it("returns null instead of throwing when offline", async () => {
    await expect(
      requestToolSummary(
        { count: 0, postings: [] },
        undefined,
        jest.fn().mockRejectedValue(new Error("offline")),
      ),
    ).resolves.toBeNull();
  });
});
