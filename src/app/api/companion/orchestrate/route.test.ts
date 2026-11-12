/** @jest-environment node */
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn().mockResolvedValue(undefined),
  AuthError: class AuthError extends Error {},
}));
jest.mock("@/lib/orchestrator/loop", () => ({
  runOrchestrator: jest.fn(),
}));
jest.mock("@/lib/auth/server-session", () => ({
  getSession: jest.fn(async () => null),
}));
jest.mock("@/lib/agent/runs", () => ({
  saveAgentRun: jest.fn(async () => undefined),
}));

import { POST } from "@/app/api/companion/orchestrate/route";
import { saveAgentRun } from "@/lib/agent/runs";
import { getSession } from "@/lib/auth/server-session";
import { runOrchestrator } from "@/lib/orchestrator/loop";

const request = (body: unknown) =>
  new Request("http://localhost/api/companion/orchestrate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const valid = {
  lane: "periksa",
  question: "apakah ini penipuan?",
  message: "Kirim OTP sekarang.",
  history: [],
  priorTurns: [],
  consent: true,
};

describe("POST /api/companion/orchestrate", () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env, LUMINA_COMPANION_ORCHESTRATOR: "1" };
    jest.mocked(runOrchestrator).mockClear();
    jest.mocked(saveAgentRun).mockClear();
    jest.mocked(runOrchestrator).mockImplementation(async (_req, deps) => {
      const events = [
        {
          type: "run_start",
          runId: "run-1",
          seq: 1,
          at: 1,
          question: "apakah ini penipuan?",
        },
        {
          type: "synthesis_end",
          runId: "run-1",
          seq: 2,
          at: 2,
          agent: "synthesizer",
          text: "Pesan ini berisiko.",
          ms: 5,
        },
      ] as unknown as import("@/lib/contracts/orchestrator").OrchestratorEvent[];
      const result = {
        events,
        trace: {
          runId: "run-1",
          commander: { text: "Halo", source: "model", ms: 1 },
          planner: { rationale: "", agents: [], source: "model", ms: 1 },
          agents: [],
          synthesis: "",
          totalMs: 2,
          degraded: false,
        } as never,
        text: "Pesan ini berisiko.",
        score: { score: 80, risk: "tinggi", modus: "jual-beli" } as never,
        degraded: false,
      };
      for (const event of events) deps?.onEvent?.(event);
      return result;
    });
  });
  afterAll(() => {
    process.env = env;
  });

  it("streams the typed events as SSE", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain('"type":"plan"'.replace("plan", "run_start"));
    expect(body).toContain('"type":"synthesis_end"');
    expect(body).toContain("[DONE]");
  });

  it("is a hard 404 when the flag is off", async () => {
    process.env.LUMINA_COMPANION_ORCHESTRATOR = "0";
    const response = await POST(request(valid));
    expect(response.status).toBe(404);
  });

  it("requires consent:true and a real message", async () => {
    const response = await POST(request({ ...valid, consent: false }));
    expect(response.status).toBe(400);
    expect(runOrchestrator).not.toHaveBeenCalled();
  });

  it("persists a summary only for a signed-in session", async () => {
    jest.mocked(getSession).mockResolvedValueOnce({
      id: "user-1",
      email: "u@example.test",
      nama: "Uji",
      created_at: "2026-11-10T00:00:00.000Z",
      exp: 9_999_999_999,
    });
    const response = await POST(request(valid));
    await response.text();
    expect(saveAgentRun).toHaveBeenCalledTimes(1);
    const [[userId, summary]] = jest.mocked(saveAgentRun).mock.calls;
    expect(userId).toBe("user-1");
    expect(summary).not.toHaveProperty("caseId");
    jest.mocked(getSession).mockResolvedValue(null);
    const anonymous = await POST(request(valid));
    await anonymous.text();
    expect(saveAgentRun).toHaveBeenCalledTimes(1);
  });

  it("still streams when the session read throws", async () => {
    jest.mocked(getSession).mockRejectedValueOnce(new Error("db down"));
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    await response.text();
    expect(saveAgentRun).not.toHaveBeenCalled();
  });
});
