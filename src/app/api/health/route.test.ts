/** @jest-environment node */

import { authDatabase } from "@/lib/auth/database";
import { GET } from "./route";

jest.mock("next/server", () => ({
  connection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/auth/database", () => ({ authDatabase: jest.fn() }));
it("reports readiness without exposing database errors", async () => {
  jest
    .mocked(authDatabase)
    .mockReturnValueOnce({ query: jest.fn().mockResolvedValue({}) } as never);
  expect(await (await GET()).json()).toEqual({ status: "ok" });
  jest.mocked(authDatabase).mockImplementationOnce(() => {
    throw new Error("secret");
  });
  const result = await GET();
  expect(result.status).toBe(503);
  expect(await result.json()).toEqual({ status: "unavailable" });
});
