/** @jest-environment node */
import { pollScan, triggerScan } from "@/lib/loker/scan-client";

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("triggerScan", () => {
  it("maps 202 to started and 409 to running", async () => {
    expect(await triggerScan(jest.fn().mockResolvedValue(response(202)))).toBe(
      "started",
    );
    expect(await triggerScan(jest.fn().mockResolvedValue(response(409)))).toBe(
      "running",
    );
  });

  it("maps 401 to unauthorized and a network failure to failed", async () => {
    expect(await triggerScan(jest.fn().mockResolvedValue(response(401)))).toBe(
      "unauthorized",
    );
    expect(
      await triggerScan(jest.fn().mockRejectedValue(new Error("offline"))),
    ).toBe("failed");
  });
});

describe("pollScan", () => {
  it("returns the first settled status", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        response(200, {
          status: "running",
          found: 0,
          added: 0,
          dropped: 0,
          finishedAt: null,
        }),
      )
      .mockResolvedValueOnce(
        response(200, {
          status: "ok",
          found: 40,
          added: 26,
          dropped: 14,
          finishedAt: "2026-11-09T00:00:00.000Z",
        }),
      );
    const seen: string[] = [];
    const out = await pollScan((s) => seen.push(s.status), {
      fetchImpl,
      intervalMs: 0,
    });
    expect(out?.status).toBe("ok");
    expect(seen).toEqual(["running", "ok"]);
  });

  it("returns null when no run exists yet", async () => {
    const out = await pollScan(jest.fn(), {
      fetchImpl: jest.fn().mockResolvedValue(response(204)),
    });
    expect(out).toBeNull();
  });
});
