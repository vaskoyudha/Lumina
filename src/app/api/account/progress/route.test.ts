/** @jest-environment node */
import { GET } from "@/app/api/account/progress/route";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { readAccountProgress } from "@/lib/learning/store";
import { EMPTY_PROGRESS } from "@/lib/progress";

jest.mock("@/lib/auth/database", () => ({ authDatabase: jest.fn() }));
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/learning/store", () => ({ readAccountProgress: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
it("requires a session and never reads another account from query input", async () => {
  jest.mocked(getSession).mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(401);
  expect(readAccountProgress).not.toHaveBeenCalled();
});
it("returns only the signed-in account progress without caching", async () => {
  jest.mocked(getSession).mockResolvedValue({ id: "user-a" } as never);
  jest
    .mocked(readAccountProgress)
    .mockResolvedValue({ ...EMPTY_PROGRESS, completedModules: [10] });
  jest.mocked(authDatabase).mockReturnValue({
    query: jest.fn().mockResolvedValue({ rows: [{ total: 13 }] }),
  } as never);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(readAccountProgress).toHaveBeenCalledWith("user-a");
  expect(await response.json()).toMatchObject({
    progress: { completedModules: [10] },
    moduleCount: 13,
  });
});
it("reports database failure instead of returning empty progress", async () => {
  jest.mocked(getSession).mockResolvedValue({ id: "user-a" } as never);
  jest
    .mocked(readAccountProgress)
    .mockRejectedValue(new Error("secret database detail"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("secret");
});
