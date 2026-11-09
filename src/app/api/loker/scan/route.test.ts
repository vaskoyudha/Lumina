/** @jest-environment node */
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn(),
  AuthError: class AuthError extends Error {},
}));
jest.mock("@/lib/auth/database", () => ({ authDatabase: jest.fn() }));
jest.mock("@/lib/loker/run", () => ({ runScanJob: jest.fn() }));
jest.mock("@/lib/loker/store", () => ({
  startScanRun: jest.fn(),
  latestScanRun: jest.fn(),
}));
jest.mock("next/server", () => ({
  after: (cb: () => Promise<void>) => {
    (globalThis as { __after?: () => Promise<void> }).__after = cb;
  },
  connection: jest.fn(),
}));

import { POST } from "@/app/api/loker/scan/route";
import { consumeAttempt } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { runScanJob } from "@/lib/loker/run";
import { startScanRun } from "@/lib/loker/store";

const session = { nama: "Rina", email: "rina@example.com" } as never;

function client(lock: boolean) {
  return {
    query: jest.fn().mockResolvedValue({ rows: [{ ok: lock }] }),
    release: jest.fn(),
  };
}

function request(): Request {
  return new Request("http://localhost/api/loker/scan", { method: "POST" });
}

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as { __after?: () => Promise<void> }).__after = undefined;
  jest.mocked(consumeAttempt).mockResolvedValue(undefined);
});

describe("POST /api/loker/scan", () => {
  it("requires a session", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(authDatabase).not.toHaveBeenCalled();
  });

  it("returns 409 when another scan holds the advisory lock", async () => {
    jest.mocked(getSession).mockResolvedValue(session);
    const fake = client(false);
    jest
      .mocked(authDatabase)
      .mockReturnValue({ connect: jest.fn().mockResolvedValue(fake) } as never);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(fake.release).toHaveBeenCalled();
    expect(startScanRun).not.toHaveBeenCalled();
  });

  it("starts a run and releases the lock in the background", async () => {
    jest.mocked(getSession).mockResolvedValue(session);
    const fake = client(true);
    jest
      .mocked(authDatabase)
      .mockReturnValue({ connect: jest.fn().mockResolvedValue(fake) } as never);
    jest.mocked(startScanRun).mockResolvedValue(42);
    jest.mocked(runScanJob).mockResolvedValue(undefined);

    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, runId: 42 });

    await (globalThis as { __after?: () => Promise<void> }).__after?.();
    expect(runScanJob).toHaveBeenCalledWith(42);
    expect(fake.query).toHaveBeenCalledWith(
      "select pg_advisory_unlock(hashtext('loker_scan'))",
    );
    expect(fake.release).toHaveBeenCalled();
  });
});
