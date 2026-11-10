/** @jest-environment node */

import { consumeAttempt } from "@/lib/auth/accounts";
import { getSession } from "@/lib/auth/server-session";
import {
  getAccountProgress,
  startSimulationIntrusion,
  submitQuiz,
  submitSimulation,
} from "@/lib/learning/actions";
import {
  recordSimulationIntrusion,
  saveQuiz,
  saveSimulation,
} from "@/lib/learning/store";
import { EMPTY_PROGRESS } from "@/lib/progress";

jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/accounts", () => ({ consumeAttempt: jest.fn() }));
jest.mock("@/lib/learning/store", () => ({
  saveQuiz: jest.fn(),
  saveSimulation: jest.fn(),
  recordSimulationIntrusion: jest.fn(),
  readAccountProgress: jest.fn(),
  readSimulationResults: jest.fn(),
  LearningError: class extends Error {},
}));
beforeEach(() => jest.clearAllMocks());
it("rejects guests and expired sessions without writing", async () => {
  jest.mocked(getSession).mockResolvedValue(null);
  expect((await submitQuiz({})).ok).toBe(false);
  expect((await submitSimulation({})).ok).toBe(false);
  expect((await getAccountProgress()).ok).toBe(false);
  expect((await startSimulationIntrusion({})).ok).toBe(false);
  expect(recordSimulationIntrusion).not.toHaveBeenCalled();
  expect(saveQuiz).not.toHaveBeenCalled();
  expect(saveSimulation).not.toHaveBeenCalled();
});
it("records a rate-limited intrusion timer only for the signed-in account", async () => {
  jest.mocked(getSession).mockResolvedValue({ id: "account-a" } as never);
  const input = {
    attemptId: "892e48bd-9178-461d-bd83-c32fc614bb23",
    scenarioId: "L1-kurir-apk",
  };
  expect(
    (await startSimulationIntrusion({ ...input, userId: "account-b" })).ok,
  ).toBe(true);
  expect(consumeAttempt).toHaveBeenCalledWith(
    "simulation:timer:account-a",
    30,
    60000,
  );
  expect(recordSimulationIntrusion).toHaveBeenCalledWith("account-a", input);
});
it("takes ownership from the session, ignoring a client-supplied user id", async () => {
  jest.mocked(getSession).mockResolvedValue({
    id: "account-a",
    email: "a@example.test",
    nama: "A",
    created_at: "2026-11-09",
    exp: 9999999999,
  });
  jest.mocked(saveQuiz).mockResolvedValue(EMPTY_PROGRESS);
  await submitQuiz({
    userId: "account-b",
    moduleNo: 10,
    answers: { q: "a" },
    complete: true,
  });
  expect(saveQuiz).toHaveBeenCalledWith("account-a", 10, { q: "a" }, true);
});
it("returns a retryable failure without claiming a save", async () => {
  jest.mocked(getSession).mockResolvedValue({
    id: "account-a",
    email: "a@example.test",
    nama: "A",
    created_at: "2026-11-09",
    exp: 9999999999,
  });
  jest.mocked(saveQuiz).mockRejectedValue(new Error("DB down"));
  expect(
    await submitQuiz({ moduleNo: 10, answers: { q: "a" }, complete: true }),
  ).toEqual({ ok: false, error: expect.stringMatching(/belum tersimpan/) });
});
