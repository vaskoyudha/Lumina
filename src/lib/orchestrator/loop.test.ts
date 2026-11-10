import type { OrchestratorRequest } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";
import { runOrchestrator } from "@/lib/orchestrator/loop";

const baseline: ScoreResult = {
  score: 72,
  risk: "tinggi",
  signals: [
    {
      label: "Meminta kode OTP",
      weight: 0.9,
      evidence: "kirim kode OTP",
      agent: "message",
      mechanism: "credential-request",
    },
  ],
  modus: "penipuan-otp",
  advice: ["Jangan kirim kode OTP."],
  relatedModule: 3,
  hardOverride: true,
};

const request: OrchestratorRequest = {
  lane: "periksa",
  question: "apakah pesan ini penipuan?",
  message: "Selamat! Kirim kode OTP untuk klaim hadiah.",
  history: [],
  priorTurns: [],
  consent: true,
};

const path = { stages: [], totalMs: 1, validation: {} } as never;
const scored = (() => ({ result: baseline, trace: path })) as never;

function systemOf(messages: { role: string; content: string | null }[]) {
  return messages[0]?.content ?? "";
}

function reportCall(
  id: string,
  signal = "Meminta kode OTP",
  quote = "kirim kode OTP",
) {
  return {
    id,
    type: "function",
    function: {
      name: "submit_report",
      arguments: JSON.stringify({
        thought: "Permintaan OTP adalah indikator kredensial.",
        summary: "Pesan meminta kode OTP.",
        points: [
          {
            signal,
            point: "Pesan meminta kode OTP.",
            reason: "Bank tidak meminta kode OTP lewat chat.",
            pattern: "credential-request",
            watchout: "Jangan kirim kode OTP.",
            quote,
          },
        ],
        watchouts: ["Jangan kirim kode OTP."],
        confidence: 0.9,
      }),
    },
  };
}

function plannerCall() {
  return {
    role: "assistant",
    content: JSON.stringify({
      rationale: "Pesan meminta OTP dan memakai tekanan hadiah.",
      agents: [
        { agent: "message", task: "Periksa narasi dan OTP." },
        { agent: "qris", task: "Periksa jalur pembayaran." },
      ],
    }),
  };
}

function toolCall(id: string, name: string, args: unknown) {
  return {
    id,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  };
}

describe("runOrchestrator", () => {
  it("runs identity agents and carries their points into synthesis", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return {
            role: "assistant",
            content:
              "Pesan ini berisiko tinggi (72/100). Permintaan OTP adalah tanda penipuan; jangan kirim kode.",
          };
        }
        return {
          role: "assistant",
          content: null,
          tool_calls: [reportCall(`call-${Math.random()}`)],
        };
      },
    );

    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
    });

    expect(result.text).toContain("72/100");
    expect(result.trace.agents.map((agent) => agent.id)).toEqual([
      "message",
      "qris",
    ]);
    expect(result.trace.agents[0].points).toHaveLength(1);
    expect(result.trace.agents[0].points[0].pattern).toBe("credential-request");
    expect(
      result.events
        .filter((event) => event.type === "agent_start")
        .map((event) => event.task),
    ).toEqual(["Periksa narasi dan OTP.", "Periksa jalur pembayaran."]);
    expect(
      chat.mock.calls.some(([options]) =>
        String(options.messages[1]?.content).includes(
          "Tugas dari koordinator: Periksa narasi dan OTP.",
        ),
      ),
    ).toBe(true);
    expect(
      result.events.filter((event) => event.type === "agent_result"),
    ).toHaveLength(2);
    expect(
      result.events.some(
        (event) =>
          event.type === "tool_result" &&
          event.tool === "submit_report" &&
          event.ok,
      ),
    ).toBe(true);
  });

  it("keeps the specialist that owns a strong detector signal", async () => {
    const jobBaseline: ScoreResult = {
      ...baseline,
      score: 84,
      modus: "lowongan-tugas-berbayar",
      signals: [
        {
          label: "Tugas berbayar meminta pembayaran lanjutan",
          weight: 0.82,
          evidence: "tugas2 selanjutnya",
          agent: "job",
          mechanism: "payment-redirect",
        },
      ],
    };
    const jobRequest: OrchestratorRequest = {
      ...request,
      question: "apakah tugas berbayar ini penipuan?",
      message:
        "itu 420K masih ada bayar lagi tidak untuk tugas2 selanjutnya, dan apa bisa langsung di tarik?",
    };
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor resmi 84/100." };
        }
        return {
          role: "assistant",
          content: null,
          tool_calls: [
            reportCall("call-job", "Tugas berbayar", "tugas2 selanjutnya"),
          ],
        };
      },
    );

    const result = await runOrchestrator(jobRequest, {
      chat: chat as never,
      score: (() => ({ result: jobBaseline, trace: path })) as never,
    });

    const plan = result.events.find((event) => event.type === "plan");
    expect(plan?.type).toBe("plan");
    if (plan?.type === "plan") {
      expect(plan.agents.map((step) => step.agent)).toContain("job");
    }
  });

  it("returns a tool error and accepts a corrected report", async () => {
    let specialistCalls = 0;
    const attempts = new Map<string, number>();
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor resmi 72/100." };
        }
        const key = system.includes("Mochi") ? "message" : "qris";
        const attempt = (attempts.get(key) ?? 0) + 1;
        attempts.set(key, attempt);
        specialistCalls += 1;
        return {
          role: "assistant",
          content: null,
          tool_calls: [
            reportCall(
              `call-${specialistCalls}`,
              attempt === 1 ? "Sinyal karangan" : "Meminta kode OTP",
              attempt === 1 ? "kutipan yang tidak ada" : "kirim kode OTP",
            ),
          ],
        };
      },
    );

    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
    });

    let sawFailure = false;
    let sawSuccess = false;
    for (const event of result.events) {
      if (event.type !== "tool_result" || event.tool !== "submit_report") {
        continue;
      }
      if (event.ok) sawSuccess = true;
      else sawFailure = true;
    }
    expect(sawFailure).toBe(true);
    expect(sawSuccess).toBe(true);
    expect(
      result.trace.agents.every((agent) => agent.points.length === 1),
    ).toBe(true);
  });

  it("keeps a correction slot after a non-report tool call", async () => {
    const attempts = new Map<string, number>();
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor resmi 72/100." };
        }
        const key = system.includes("Mochi") ? "message" : "qris";
        const attempt = (attempts.get(key) ?? 0) + 1;
        attempts.set(key, attempt);
        if (key === "message" && attempt === 1) {
          return {
            role: "assistant",
            content: null,
            tool_calls: [toolCall("call-extract", "extract_entities", {})],
          };
        }
        if (key === "message" && attempt === 2) {
          return {
            role: "assistant",
            content: null,
            tool_calls: [reportCall("call-invalid", "Sinyal karangan")],
          };
        }
        return {
          role: "assistant",
          content: null,
          tool_calls: [reportCall(`call-${key}-${attempt}`)],
        };
      },
    );

    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
    });

    expect(
      result.events.some(
        (event) =>
          event.type === "tool_result" &&
          event.tool === "extract_entities" &&
          event.ok,
      ),
    ).toBe(true);
    expect(
      result.events.some(
        (event) =>
          event.type === "tool_result" &&
          event.tool === "submit_report" &&
          event.ok,
      ),
    ).toBe(true);
    expect(
      result.trace.agents.find((agent) => agent.id === "message")?.points,
    ).toHaveLength(1);
  });

  it("replaces a fabricated score in the synthesis with the deterministic score", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor 172/100, waspada." };
        }
        return {
          role: "assistant",
          content: null,
          tool_calls: [reportCall("call-score")],
        };
      },
    );

    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
    });

    expect(result.text).toContain("72/100");
    expect(result.text).not.toContain("172/100");
  });

  it("accepts an empty report when the scorer only returns a zero-weight signal", async () => {
    const cleanBaseline: ScoreResult = {
      ...baseline,
      score: 0,
      risk: "bersih",
      signals: [
        {
          label: "Tidak ada pola penipuan yang terdeteksi",
          weight: 0,
          evidence: "",
          agent: "message",
        },
      ],
      modus: "tidak-ada",
      hardOverride: false,
    };
    const cleanScored = (() => ({
      result: cleanBaseline,
      trace: path,
    })) as never;

    const emptyReport = {
      thought: "Tidak ada sinyal berbobot.",
      summary: "Tidak ada pola penipuan yang bisa dibuktikan.",
      points: [],
      watchouts: [],
      confidence: 0.8,
    };
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor resmi 0/100." };
        }
        return {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-empty",
              type: "function",
              function: {
                name: "submit_report",
                arguments: JSON.stringify(emptyReport),
              },
            },
          ],
        };
      },
    );

    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: cleanScored,
    });

    const agentResults = result.events.filter(
      (event) => event.type === "agent_result",
    );
    expect(agentResults.length).toBeGreaterThan(0);
    expect(
      agentResults.every(
        (event) => event.type === "agent_result" && event.status === "selesai",
      ),
    ).toBe(true);
  });

  it("fails honestly instead of leaking raw JSON after two invalid reports", async () => {
    const result = await runOrchestrator(request, {
      chat: async (options) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor resmi 72/100." };
        }
        return {
          role: "assistant",
          content: '{"thought": "analisis mentah", "summary": "belum lengkap"',
          tool_calls: [],
        };
      },
      score: scored,
    });

    const reports = result.events.filter(
      (event) => event.type === "agent_result",
    );
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      if (report.type !== "agent_result") continue;
      expect(report.status).toBe("gagal");
      expect(report.points).toEqual([]);
      expect(report.summary.trim().startsWith("{")).toBe(false);
    }
  });

  it("keeps the deterministic score when the planner is unavailable", async () => {
    const result = await runOrchestrator(request, {
      chat: async () => ({ role: "assistant", content: "not json" }) as never,
      score: scored,
    });

    expect(result.score.score).toBe(72);
    expect(result.text).toContain("72/100");
    const plan = result.events.find((event) => event.type === "plan");
    expect(plan?.type === "plan" ? plan.rationale : "").toContain("Mochi");
    expect(plan?.type === "plan" ? plan.rationale : "").not.toContain(
      "injeksi",
    );
    expect(result.events.some((event) => event.type === "synthesis_end")).toBe(
      true,
    );
  });
});
