import type { OrchestratorRequest } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";
import { runOrchestrator } from "@/lib/orchestrator/loop";
import { clearSubagentSessions } from "@/lib/orchestrator/subagent-runtime";

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
      "evidence",
    ]);
    expect(result.trace.agents[0].points).toHaveLength(1);
    expect(result.trace.agents[0].points[0].pattern).toBe("credential-request");
    expect(
      result.events
        .filter((event) => event.type === "agent_start")
        .map((event) => event.task),
    ).toEqual([
      "Periksa narasi dan OTP.",
      "Periksa jalur pembayaran.",
      "Audit kutipan dan deduplikasi temuan.",
    ]);
    expect(
      chat.mock.calls.some(([options]) =>
        String(options.messages[1]?.content).includes(
          "Tugas dari koordinator: Periksa narasi dan OTP.",
        ),
      ),
    ).toBe(true);
    expect(
      result.events.filter((event) => event.type === "agent_result"),
    ).toHaveLength(3);
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

  it("marks a specialist with no assigned signal as skipped, not failed", async () => {
    const clean: ScoreResult = {
      ...baseline,
      score: 0,
      risk: "bersih",
      signals: [],
      modus: "tidak-ada",
      hardOverride: false,
    };
    const cleanScored = (() => ({ result: clean, trace: path })) as never;
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor resmi 0/100." };
        }
        return { role: "assistant", content: null, tool_calls: [] };
      },
    );

    const result = await runOrchestrator(
      { ...request, message: "Tidak ada pola penipuan di sini." },
      { chat: chat as never, score: cleanScored },
    );

    const qris = result.events.find(
      (event) => event.type === "agent_result" && event.agent === "qris",
    );
    expect(qris?.type === "agent_result" ? qris.status : null).toBe("dilewati");
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
      expect(["gagal", "dilewati"]).toContain(report.status);
      expect(report.points).toEqual([]);
      expect(report.summary.trim().startsWith("{")).toBe(false);
    }
    expect(
      reports.some(
        (report) => report.type === "agent_result" && report.status === "gagal",
      ),
    ).toBe(true);
  });

  it("reuses the same child session for the same case id", async () => {
    const caseId = "case-session-reuse";
    clearSubagentSessions(caseId);
    const specialistPrompts: string[] = [];
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban")) {
          return { role: "assistant", content: "Skor resmi 72/100." };
        }
        specialistPrompts.push(
          options.messages
            .map((message) => String(message.content ?? ""))
            .join("\n"),
        );
        return {
          role: "assistant",
          content: null,
          tool_calls: [reportCall(`call-${Math.random()}`)],
        };
      },
    );
    const scoped = { ...request, caseId };

    await runOrchestrator(scoped, { chat: chat as never, score: scored });
    await runOrchestrator(scoped, { chat: chat as never, score: scored });

    const reused = specialistPrompts.filter(
      (prompt) =>
        prompt.split("Tugas dari koordinator: Periksa narasi dan OTP.").length -
          1 >=
        2,
    );
    expect(reused.length).toBeGreaterThan(0);
    expect(reused.some((prompt) => prompt.includes("<follow_up>"))).toBe(true);
    clearSubagentSessions(caseId);
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

  function commanderCall(text: string, focus = "permintaan OTP") {
    return {
      role: "assistant",
      content: JSON.stringify({ announcement: text, focus }),
    };
  }

  it("speaks as Lumina before planning", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("komandan agen"))
          return commanderCall(
            "Saya melihat pola permintaan OTP yang sering dipakai penipuan. Saya akan memanggil agen yang relevan.",
          );
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 72/100." };
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
    const types = result.events.map((event) => event.type);

    expect(types.indexOf("commander_say")).toBeGreaterThan(
      types.indexOf("run_start"),
    );
    expect(types.indexOf("commander_say")).toBeLessThan(types.indexOf("plan"));
    expect(result.trace.commander.source).toBe("model");
    expect(result.trace.commander.text).toContain("permintaan OTP");
  });

  it("falls back when the commander leaks a band", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("komandan agen"))
          return commanderCall("Saya rasa ini mencurigakan.");
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 72/100." };
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
    const say = result.events.find((event) => event.type === "commander_say");

    expect(result.trace.commander.source).toBe("fallback");
    expect(say && say.type === "commander_say" ? say.text : "").not.toMatch(
      /mencurigakan/i,
    );
  });

  it("falls back when the commander puts a band in focus", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("komandan agen"))
          return commanderCall(
            "Saya sudah membaca pesan ini dan akan memeriksa polanya.",
            "penipuan tinggi",
          );
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 72/100." };
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
    const say = result.events.find((event) => event.type === "commander_say");

    expect(result.trace.commander.source).toBe("fallback");
    expect(say && say.type === "commander_say" ? say.focus : "").not.toMatch(
      /tinggi/i,
    );
  });

  function plannerCallWith(
    agents: { agent: string; task: string }[],
    rationale = "Rencana uji.",
  ) {
    return {
      role: "assistant",
      content: JSON.stringify({ rationale, agents }),
    };
  }

  const sixAgents = [
    { agent: "qris", task: "Periksa pembayaran." },
    { agent: "message", task: "Periksa narasi." },
    { agent: "link", task: "Periksa tautan." },
    { agent: "identity", task: "Periksa identitas." },
    { agent: "conversation", task: "Periksa eskalasi." },
    { agent: "job", task: "Periksa lowongan." },
  ];

  function serialChat(planner: () => unknown) {
    return jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("komandan agen"))
          return commanderCall("Saya melihat pola penipuan pembayaran.");
        if (system.includes("koordinator tim agen")) return planner();
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 72/100." };
        return {
          role: "assistant",
          content: null,
          tool_calls: [reportCall(`call-${Math.random()}`)],
        };
      },
    );
  }

  it("runs specialists one at a time and appends evidence last", async () => {
    const chat = serialChat(() => plannerCallWith(sixAgents));
    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
    });
    const order = result.events
      .filter(
        (event) =>
          event.type === "agent_start" || event.type === "agent_result",
      )
      .map((event) =>
        event.type === "agent_start"
          ? `start:${event.agent}`
          : `end:${event.agent}`,
      );

    expect(result.trace.agents.map((agent) => agent.id)).toEqual([
      "qris",
      "message",
      "link",
      "identity",
      "conversation",
      "evidence",
    ]);
    for (let index = 0; index < order.length; index += 2) {
      expect(order[index]).toBe(`start:${result.trace.agents[index / 2].id}`);
      expect(order[index + 1]).toBe(`end:${result.trace.agents[index / 2].id}`);
    }
  });

  it("keeps the baseline specialist when the planner fills the plan", async () => {
    const fiveAgents = [
      { agent: "qris", task: "Periksa pembayaran." },
      { agent: "link", task: "Periksa tautan." },
      { agent: "identity", task: "Periksa identitas." },
      { agent: "conversation", task: "Periksa eskalasi." },
      { agent: "job", task: "Periksa lowongan." },
    ];
    const chat = serialChat(() => plannerCallWith(fiveAgents));
    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
    });
    const plan = result.events.find((event) => event.type === "plan");

    expect(plan?.type).toBe("plan");
    if (plan?.type !== "plan") return;
    const ids = plan.agents.map((step) => step.agent);

    expect(ids).toEqual([
      "qris",
      "link",
      "identity",
      "conversation",
      "message",
      "evidence",
    ]);
    expect(ids.filter((id) => id === "message")).toHaveLength(1);
    expect(ids[ids.length - 1]).toBe("evidence");
    expect(ids).not.toContain("job");
  });

  it("runs the first specialist and skips the rest at the deadline", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("komandan agen"))
          return commanderCall("Saya melihat pola penipuan pembayaran.");
        if (system.includes("koordinator tim agen"))
          return plannerCallWith(sixAgents);
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 72/100." };
        await new Promise((resolve) => setTimeout(resolve, 50));
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
      deadlineMs: 30,
    });
    const statuses = result.trace.agents.map((agent) => agent.status);

    expect(statuses[0]).toBe("selesai");
    expect(statuses.slice(1).every((status) => status === "dilewati")).toBe(
      true,
    );
    expect(result.trace.degraded).toBe(true);

    const agentEvents = result.events.filter(
      (event) => event.type === "agent_start" || event.type === "agent_result",
    );
    for (const agent of result.trace.agents) {
      if (agent.status !== "dilewati") continue;
      const startIndex = agentEvents.findIndex(
        (event) => event.type === "agent_start" && event.agent === agent.id,
      );
      expect(startIndex).toBeGreaterThanOrEqual(0);
      const next = agentEvents[startIndex + 1];
      expect(next?.type).toBe("agent_result");
      expect(next?.type === "agent_result" ? next.agent : null).toBe(agent.id);
    }
  });

  it("emits a start before the result for agents skipped by an abort", async () => {
    const controller = new AbortController();
    controller.abort();
    const chat = serialChat(() => plannerCallWith(sixAgents));
    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
      signal: controller.signal,
    });

    expect(
      result.trace.agents.every((agent) => agent.status === "dilewati"),
    ).toBe(true);
    expect(result.trace.agents.length).toBeGreaterThanOrEqual(sixAgents.length);

    const agentEvents = result.events.filter(
      (event) => event.type === "agent_start" || event.type === "agent_result",
    );
    for (const agent of result.trace.agents) {
      if (agent.status !== "dilewati") continue;
      const startIndex = agentEvents.findIndex(
        (event) => event.type === "agent_start" && event.agent === agent.id,
      );
      expect(startIndex).toBeGreaterThanOrEqual(0);
      const next = agentEvents[startIndex + 1];
      expect(next?.type).toBe("agent_result");
      expect(next?.type === "agent_result" ? next.agent : null).toBe(agent.id);
    }
  });

  it("lets Lumina score a consensus the engine missed", async () => {
    const zero: ScoreResult = {
      ...baseline,
      score: 0,
      risk: "bersih",
      signals: [],
      modus: "tidak-dikenali",
      advice: [],
      relatedModule: null,
      hardOverride: false,
    };
    const message =
      "Kak, saya sudah transfer Rp1.500.000 untuk barang Rp1.000.000. Kelebihannya tolong kembalikan ke rekening saya, nanti saya transfer lagi.";
    const report = (agent: "marketplace" | "qris") => ({
      id: `call-${agent}`,
      type: "function",
      function: {
        name: "submit_report",
        arguments: JSON.stringify({
          summary: "Ada klaim transfer berlebih.",
          points: [
            {
              signal: "Kelebihan transfer",
              point: "Pembeli mengaku mentransfer lebih dari harga.",
              reason: "Pola overpayment.",
              pattern: "overpayment-refund",
              watchout: "Jangan mengembalikan dana sebelum dana masuk.",
              quote: "transfer Rp1.500.000",
            },
          ],
          watchouts: ["Jangan mengembalikan dana sebelum dana masuk."],
          confidence: 0.8,
        }),
      },
    });
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("komandan agen"))
          return commanderCall("Aku melihat pola kelebihan bayar.");
        if (system.includes("koordinator tim agen"))
          return plannerCallWith([
            { agent: "marketplace", task: "Periksa alur jual-beli." },
            { agent: "qris", task: "Periksa refund QRIS." },
          ]);
        if (system.includes("penentu skor akhir"))
          return {
            role: "assistant",
            content: null,
            tool_calls: [
              toolCall("score-1", "submit_score", {
                score: 78,
                rationale: "Dua agen menemukan klaim transfer berlebih.",
                pointSignals: ["Kelebihan transfer"],
              }),
            ],
          };
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 78/100." };
        return {
          role: "assistant",
          content: null,
          tool_calls: [
            report(system.includes("Mochi") ? "marketplace" : "qris"),
          ],
        };
      },
    );

    const result = await runOrchestrator(
      { ...request, message },
      {
        chat: chat as never,
        score: (() => ({ result: zero, trace: path })) as never,
      },
    );

    expect(result.score.score).toBe(78);
    expect(result.trace.baselineScore?.score).toBe(0);
    expect(result.trace.finalScore?.score).toBe(78);
    expect(result.trace.consensus?.[0].pattern).toBe("overpayment-refund");
    expect(
      result.events.find((event) => event.type === "score_decision"),
    ).toMatchObject({ source: "model", result: { score: 78 } });
    expect(result.text).toContain("78/100");
  });

  it("keeps the engine score when no consensus forms", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 72/100." };
        const key = system.includes("Mochi")
          ? "message"
          : system.includes("Bao")
            ? "evidence"
            : "qris";
        const pattern =
          key === "message"
            ? "credential-request"
            : key === "qris"
              ? "credential-request-other"
              : "evidence-audit";
        return {
          role: "assistant",
          content: null,
          tool_calls: [
            toolCall(`call-${key}`, "submit_report", {
              summary: "Ada permintaan kode.",
              points: [
                {
                  signal: `Sinyal ${key}`,
                  point: "Pesan meminta kode.",
                  reason: "Permintaan kredensial.",
                  pattern,
                  watchout: "Jangan kirim kode.",
                  quote: "kirim kode OTP",
                },
              ],
              watchouts: ["Jangan kirim kode."],
              confidence: 0.7,
            }),
          ],
        };
      },
    );

    const result = await runOrchestrator(request, {
      chat: chat as never,
      score: scored,
    });

    expect(result.score.score).toBe(72);
    expect(result.events.some((event) => event.type === "score_decision")).toBe(
      false,
    );
  });

  it("keeps the engine score when Lumina submits no decision", async () => {
    const chat = jest.fn(
      async (options: {
        messages: { role: string; content: string | null }[];
      }) => {
        const system = systemOf(options.messages);
        if (system.includes("koordinator tim agen")) return plannerCall();
        if (system.includes("penentu skor akhir"))
          return { role: "assistant", content: "Aku belum yakin." };
        if (system.includes("penyusun jawaban"))
          return { role: "assistant", content: "Pesan ini 72/100." };
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

    expect(result.score.score).toBe(72);
    expect(
      result.events.find((event) => event.type === "score_decision"),
    ).toMatchObject({ source: "fallback", result: { score: 72 } });
  });
});
