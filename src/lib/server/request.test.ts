/** @jest-environment node */

import { AuthError, consumeAttempt } from "@/lib/auth/accounts";
import {
  BodyTooLarge,
  clientKey,
  limitAI,
  readJson,
} from "@/lib/server/request";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn(),
  AuthError: class AuthError extends Error {},
}));
const consume = jest.mocked(consumeAttempt);
afterEach(() => {
  delete process.env.TRUST_PROXY;
  delete process.env.LUMINA_AI_GLOBAL_LIMIT;
  consume.mockReset();
});
it("trusts only the dedicated proxy header when explicitly enabled", () => {
  const req = new Request("http://localhost", {
    headers: {
      "x-forwarded-for": "192.0.2.4",
      "x-lumina-client-ip": "192.0.2.5",
    },
  });
  expect(clientKey(req)).toBe("anonymous");
  process.env.TRUST_PROXY = "true";
  expect(clientKey(req)).toBe("192.0.2.5");
  expect(
    clientKey(
      new Request("http://localhost", {
        headers: { "x-lumina-client-ip": "spoofed" },
      }),
    ),
  ).toBe("anonymous");
});
it("rejects oversized bodies even without content length", async () => {
  await expect(
    readJson(
      new Request("http://localhost", { method: "POST", body: "123456" }),
      5,
    ),
  ).rejects.toBeInstanceOf(BodyTooLarge);
});
it("fails closed on database errors and reports limit errors", async () => {
  consume.mockRejectedValueOnce(new Error("db"));
  expect((await limitAI(new Request("http://localhost"), "text"))?.status).toBe(
    503,
  );
  consume.mockRejectedValueOnce(new AuthError("limit"));
  expect(
    (await limitAI(new Request("http://localhost"), "vision"))?.status,
  ).toBe(429);
  consume.mockResolvedValue(undefined);
  process.env.LUMINA_AI_GLOBAL_LIMIT = "50";
  expect(await limitAI(new Request("http://localhost"), "vision")).toBeNull();
  expect(consume).toHaveBeenCalledWith("ai:global", 50, 60000);
  expect(consume).toHaveBeenCalledWith("ai:vision:anonymous", 3, 60000);
});
