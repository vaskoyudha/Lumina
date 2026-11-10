import type {
  SubagentEnvelope,
  SubagentResult,
} from "@/lib/orchestrator/subagent-runtime";
import { SubagentRuntime } from "@/lib/orchestrator/subagent-runtime";

function result(agent: "message" | "job"): SubagentResult {
  return {
    agent,
    label: `${agent} agent`,
    status: "selesai",
    summary: `${agent} done`,
    findings: [],
    points: [],
    ms: 1,
  };
}

function envelope(
  overrides: Partial<SubagentEnvelope> = {},
): SubagentEnvelope {
  return {
    caseId: "case-1",
    agent: "message",
    task: "first task",
    brief: "hypothesis",
    message: "evidence",
    tools: ["score_message"],
    ...overrides,
  };
}

describe("SubagentRuntime", () => {
  it("runs a child and records its transcript", async () => {
    const run = jest.fn(async (session, input) => {
      session.messages.push({ role: "user", content: input.task });
      return result(input.agent);
    });
    const runtime = new SubagentRuntime(run, { store: new Map() });

    const runResult = await runtime.spawn(envelope());

    expect(runResult.result.status).toBe("selesai");
    expect(runResult.session.status).toBe("done");
    expect(runResult.session.turns).toBe(0);
    expect(runResult.session.messages).toHaveLength(1);
    expect(runtime.status("case-1", "message")?.status).toBe("done");
  });

  it("continues the same child on send instead of spawning a new one", async () => {
    const run = jest.fn(async (session, input) => {
      session.messages.push({ role: "user", content: input.task });
      return result(input.agent);
    });
    const runtime = new SubagentRuntime(run, { store: new Map() });

    const first = await runtime.spawn(envelope());
    const second = await runtime.send(
      envelope({ task: "follow-up question" }),
    );

    expect(second.session.id).toBe(first.session.id);
    expect(second.session.messages.map((message) => message.content)).toEqual([
      "first task",
      "follow-up question",
    ]);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("aborts a running child and reports the aborted status", async () => {
    let release: (() => void) | undefined;
    const run = jest.fn(
      async (session: { controller: AbortController }) =>
        new Promise<SubagentResult>((resolve, reject) => {
          release = () => resolve(result("message"));
          session.controller.signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    );
    const runtime = new SubagentRuntime(run as never, { store: new Map() });

    const pending = runtime.spawn(envelope()).catch((error) => error);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(runtime.abort("case-1", "message")).toBe(true);
    const settled = await pending;

    expect(settled).toBeInstanceOf(Error);
    expect(runtime.status("case-1", "message")?.status).toBe("aborted");
    release?.();
  });

  it("rejects a second send while the child is busy", async () => {
    const run = jest.fn(
      async (session: { controller: AbortController }) =>
        new Promise<SubagentResult>((resolve, reject) => {
          session.controller.signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    );
    const runtime = new SubagentRuntime(run as never, { store: new Map() });
    const pending = runtime.spawn(envelope()).catch((error) => error);
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(runtime.send(envelope())).rejects.toThrow("subagent-busy");
    runtime.abort("case-1", "message");
    await pending;
  });

  it("returns a status view and can clear a case", async () => {
    const run = jest.fn(async (_session, input) => result(input.agent));
    const runtime = new SubagentRuntime(run, { store: new Map() });
    await runtime.spawn(envelope());

    expect(runtime.list("case-1")).toHaveLength(1);
    expect(runtime.status("missing", "message")).toBeNull();
    runtime.clear("case-1");
    expect(runtime.list("case-1")).toHaveLength(0);
  });
});
