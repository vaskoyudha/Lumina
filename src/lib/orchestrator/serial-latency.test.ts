/** @jest-environment node */
import type { OrchestratorRequest } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";
import { runOrchestrator } from "@/lib/orchestrator/loop";

const enabled = process.env.LUMINA_LATENCY === "1";
const describeLatency = enabled ? describe : describe.skip;

const baseline = {
  score: 72,
  risk: "tinggi",
  signals: [],
  modus: "penipuan-otp",
  advice: [],
  relatedModule: 3,
  hardOverride: true,
} as ScoreResult;

const request: OrchestratorRequest = {
  lane: "periksa",
  question: "apakah pesan ini penipuan?",
  message: "Selamat! Kirim kode OTP untuk klaim hadiah.",
  history: [],
  priorTurns: [],
  consent: true,
};

function planner(agents: string[]) {
  return {
    role: "assistant",
    content: JSON.stringify({
      rationale: "Uji latensi.",
      agents: agents.map((agent) => ({ agent, task: "Periksa." })),
    }),
  };
}

function chatFor(agents: string[], perAgentMs: number) {
  return jest.fn(
    async (options: {
      messages: { role: string; content: string | null }[];
    }) => {
      const system = options.messages[0]?.content ?? "";
      if (system.includes("komandan agen"))
        return {
          role: "assistant",
          content: JSON.stringify({
            announcement: "Saya melihat pola.",
            focus: "",
          }),
        };
      if (system.includes("koordinator tim agen")) return planner(agents);
      if (system.includes("penyusun jawaban"))
        return { role: "assistant", content: "Pesan ini 72/100." };
      await new Promise((resolve) => setTimeout(resolve, perAgentMs));
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "submit_report",
              arguments: JSON.stringify({
                thought: "Uji.",
                summary: "Uji.",
                points: [],
                watchouts: [],
                confidence: 0.5,
              }),
            },
          },
        ],
      };
    },
  );
}

const trace = { stages: [], totalMs: 1, validation: {} } as never;
const score = (() => ({ result: baseline, trace })) as never;

describeLatency("serial specialist latency", () => {
  it("records 2-agent and 6-agent totals and proves serial order", async () => {
    const two = await runOrchestrator(request, {
      chat: chatFor(["message", "qris"], 40) as never,
      score,
    });
    const six = await runOrchestrator(request, {
      chat: chatFor(
        ["message", "qris", "link", "identity", "conversation", "job"],
        40,
      ) as never,
      score,
    });
    for (const result of [two, six]) {
      const agentEvents = result.events.filter(
        (event) =>
          event.type === "agent_start" || event.type === "agent_result",
      );
      expect(agentEvents.length).toBe(result.trace.agents.length * 2);
      for (const agent of result.trace.agents) {
        const startIndex = agentEvents.findIndex(
          (event) => event.type === "agent_start" && event.agent === agent.id,
        );
        expect(startIndex).toBeGreaterThanOrEqual(0);
        const next = agentEvents[startIndex + 1];
        expect(next?.type).toBe("agent_result");
        expect(next?.type === "agent_result" ? next.agent : null).toBe(
          agent.id,
        );
      }
    }
    console.log(
      "LATENCY",
      JSON.stringify({
        twoAgentMs: two.trace.totalMs,
        sixAgentMs: six.trace.totalMs,
      }),
    );
    expect(six.trace.agents.length).toBeGreaterThan(two.trace.agents.length);
  });
});
