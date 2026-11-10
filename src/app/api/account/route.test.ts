/** @jest-environment node */

import { cookies } from "next/headers";
import { GET } from "@/app/api/account/route";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { listSessions } from "@/lib/auth/session";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ listSessions: jest.fn() }));
jest.mock("@/lib/auth/database", () => ({ authDatabase: jest.fn() }));

describe("GET /api/account", () => {
  beforeEach(() => {
    jest.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "token" }),
    } as never);
  });

  it("returns 401 without a session", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the account and labelled sessions", async () => {
    jest.mocked(getSession).mockResolvedValue({
      id: "user-1",
      nama: "Siti",
      email: "siti@lumina.id",
      created_at: "2026-01-02T00:00:00.000Z",
      exp: 0,
    });
    jest.mocked(authDatabase).mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [{ has_password: true }] }),
    } as never);
    jest.mocked(listSessions).mockResolvedValue([
      {
        id: "a".repeat(64),
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
        clientIp: "103.28.1.2",
        signedIn: "2026-11-10T04:30:00.000Z",
        lastActive: "2026-11-10T04:30:00.000Z",
        expiresAt: "2026-11-11T04:30:00.000Z",
        current: true,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      hasPassword: true,
      account: { nama: "Siti", email: "siti@lumina.id" },
      sessions: [
        {
          device: "Firefox · Linux",
          ip: "103.28.1.2",
          current: true,
        },
      ],
    });
  });
});
