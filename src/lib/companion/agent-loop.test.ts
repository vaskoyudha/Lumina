import { runAgentLoop } from "@/lib/companion/agent-loop";
import type { AnswerRequest } from "@/lib/contracts/answer";
import type { ToolObservation } from "@/lib/contracts/loop";
import type { ToolCall } from "@/lib/contracts/tool";

function request(): AnswerRequest {
  return {
    lane: "tanya",
    question: "cari lowongan React",
    history: [],
    digest: null,
    modules: [],
    tactics: [],
    contentQuestion: false,
    attachmentContext: [],
    hasVerdict: false,
    observations: [],
    final: false,
  };
}

function jobCall(id = "call-1") {
  return {
    id,
    name: "job_search" as const,
    arguments: { query: "React" },
  };
}

function observation(callId: string): ToolObservation {
  return {
    name: "job_search",
    callId,
    arguments: { query: "React" },
    ok: true,
    result: {
      count: 1,
      total: 4,
      capped: false,
      postings: [
        {
          title: "Frontend Engineer",
          company: "Maju",
          sentinelStatus: "clean",
          luminaRisk: "bersih",
        },
      ],
    },
  };
}

function answer(
  text: string,
  toolCalls: ToolCall[] = [],
): {
  outcome: "model";
  text: string;
  toolCalls: ToolCall[];
} {
  return { outcome: "model", text, toolCalls };
}

describe("runAgentLoop", () => {
  it("makes one request when the model does not call a tool", async () => {
    const calls: AnswerRequest[] = [];
    const result = await runAgentLoop({
      request: request(),
      signal: new AbortController().signal,
      requestStep: async (input) => {
        calls.push(input);
        return answer("Halo.");
      },
      execute: async () => {
        throw new Error("must not execute");
      },
    });

    expect(result.outcome).toBe("model");
    expect(result.text).toBe("Halo.");
    expect(result.steps).toBe(1);
    expect(result.observations).toEqual([]);
    expect(calls[0]?.final).toBe(false);
  });

  it("feeds a job observation into the next request", async () => {
    const calls: AnswerRequest[] = [];
    let step = 0;
    const result = await runAgentLoop({
      request: request(),
      signal: new AbortController().signal,
      requestStep: async (input) => {
        calls.push(input);
        step += 1;
        return step === 1
          ? answer("", [jobCall()])
          : answer("Ada satu lowongan React.");
      },
      execute: async (call) => ({
        kind: "observation",
        observation: observation(call.id),
      }),
    });

    expect(result.outcome).toBe("model");
    expect(result.text).toBe("Ada satu lowongan React.");
    expect(result.steps).toBe(2);
    expect(result.observations).toHaveLength(1);
    expect(calls[1]?.observations[0]?.name).toBe("job_search");
    expect(calls[1]?.final).toBe(false);
  });

  it("ends on report_draft without a second model call", async () => {
    let requests = 0;
    const result = await runAgentLoop({
      request: { ...request(), hasVerdict: true },
      signal: new AbortController().signal,
      requestStep: async () => {
        requests += 1;
        return answer("Saya buka laporannya.", [
          { id: "report-1", name: "report_draft", arguments: {} },
        ]);
      },
      execute: async () => ({ kind: "terminal", terminal: "report" }),
    });

    expect(requests).toBe(1);
    expect(result.terminal).toBe("report");
    expect(result.text).toBe("Saya buka laporannya.");
  });

  it("stops at the step cap and withholds tools on the last request", async () => {
    const calls: AnswerRequest[] = [];
    const result = await runAgentLoop({
      request: request(),
      signal: new AbortController().signal,
      maxSteps: 3,
      requestStep: async (input) => {
        calls.push(input);
        return answer("", [jobCall(`call-${calls.length}`)]);
      },
      execute: async (call) => ({
        kind: "observation",
        observation: observation(call.id),
      }),
    });

    expect(calls).toHaveLength(3);
    expect(calls[2]?.final).toBe(true);
    expect(result.steps).toBe(3);
    expect(result.observations).toHaveLength(2);
    expect(result.ignored).toBe(1);
  });

  it("keeps a tool observation when the next step fails", async () => {
    let step = 0;
    const result = await runAgentLoop({
      request: request(),
      signal: new AbortController().signal,
      requestStep: async () => {
        step += 1;
        if (step === 1) return answer("Saya cari dulu.", [jobCall()]);
        return { outcome: "failed", text: "", toolCalls: [] };
      },
      execute: async (call) => ({
        kind: "observation",
        observation: observation(call.id),
      }),
    });

    expect(result.outcome).toBe("failed");
    expect(result.text).toBe("Saya cari dulu.");
    expect(result.observations).toHaveLength(1);
    expect(result.failed).toBe(true);
  });

  it("does not make a second request after an abort", async () => {
    const control = new AbortController();
    let requests = 0;
    const pending = runAgentLoop({
      request: request(),
      signal: control.signal,
      requestStep: async () => {
        requests += 1;
        return answer("", [jobCall()]);
      },
      execute: async (call) => {
        control.abort();
        return {
          kind: "observation",
          observation: observation(call.id),
        };
      },
    });

    const result = await pending;
    expect(requests).toBe(1);
    expect(result.outcome).toBe("timeout");
  });
});
