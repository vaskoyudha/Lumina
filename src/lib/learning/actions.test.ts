/** @jest-environment node */
import { getSession } from "@/lib/auth/server-session";
import {
  getAccountProgress,
  submitQuiz,
  submitSimulation,
} from "@/lib/learning/actions";
import { saveQuiz, saveSimulation } from "@/lib/learning/store";
import { EMPTY_PROGRESS } from "@/lib/progress";

jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/learning/store", () => ({
  saveQuiz: jest.fn(),
  saveSimulation: jest.fn(),
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
  expect(saveQuiz).not.toHaveBeenCalled();
  expect(saveSimulation).not.toHaveBeenCalled();
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
