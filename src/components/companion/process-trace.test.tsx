import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProcessTrace } from "@/components/companion/process-trace";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";

function event<T extends OrchestratorEvent["type"]>(
  value: Extract<OrchestratorEvent, { type: T }>,
): OrchestratorEvent {
  return value;
}

const events: OrchestratorEvent[] = [
  event({
    type: "run_start",
    runId: "run-1",
    seq: 0,
    at: 0,
    question: "apakah ini penipuan?",
  }),
  event({
    type: "commander_say",
    runId: "run-1",
    seq: 1,
    at: 1,
    text: "Saya melihat pola permintaan OTP. Saya akan memanggil agen yang relevan.",
    focus: "permintaan OTP",
    source: "model",
    ms: 8,
  }),
  event({
    type: "plan",
    runId: "run-1",
    seq: 3,
    at: 3,
    rationale: "Pesan meminta OTP, jadi periksa narasi dan jalur pembayaran.",
    agents: [
      {
        agent: "message",
        task: "Namai mekanisme rekayasa sosial.",
        skills: ["narrative-analysis"],
        tools: ["score_message"],
      },
      {
        agent: "qris",
        task: "Periksa jalur pembayaran dan permintaan OTP.",
        skills: ["otp-request"],
        tools: ["scan_detector"],
      },
    ],
    planner: "model",
    ms: 10,
  }),
  event({
    type: "agent_start",
    runId: "run-1",
    seq: 4,
    at: 4,
    agent: "message",
    label: "Message Agent",
    task: "Membaca narasi dan mekanisme rekayasa sosial",
    skills: ["narrative-analysis"],
    tools: ["score_message"],
  }),
  event({
    type: "tool_call",
    runId: "run-1",
    seq: 5,
    at: 5,
    agent: "message",
    callId: "call-1",
    tool: "score_message",
    args: {},
  }),
  event({
    type: "tool_result",
    runId: "run-1",
    seq: 6,
    at: 6,
    agent: "message",
    callId: "call-1",
    tool: "score_message",
    ok: true,
    ms: 2,
    output: '{"score":91}',
  }),
  event({
    type: "thought",
    runId: "run-1",
    seq: 7,
    at: 7,
    agent: "message",
    text: "Permintaan OTP adalah indikator kredensial yang harus dilaporkan.",
  }),
  event({
    type: "agent_result",
    runId: "run-1",
    seq: 8,
    at: 8,
    agent: "message",
    label: "Message Agent",
    status: "selesai",
    summary: "Pesan meminta OTP dengan dalih hadiah.",
    findings: ["Permintaan kode OTP"],
    points: [
      {
        signal: "Permintaan kode OTP",
        point: "Pesan meminta kode OTP.",
        reason: "Bank tidak meminta kode OTP lewat chat.",
        pattern: "credential-request",
        watchout: "Jangan kirim kode OTP.",
        quote: "Kirim kode OTP",
      },
    ],
    ms: 20,
  }),
  event({
    type: "synthesis_end",
    runId: "run-1",
    seq: 9,
    at: 9,
    agent: "synthesizer",
    text: "Pesan ini berisiko tinggi.",
    ms: 5,
  }),
];

describe("ProcessTrace", () => {
  it("shows the identity profile, points, and hidden thoughts", () => {
    render(<ProcessTrace events={events} />);

    expect(screen.getByText("Proses agen")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /agen di bawah komando lumina/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/agen dipanggil · 1/i)).toBeInTheDocument();
    expect(
      screen.getByText(/saya melihat pola permintaan otp/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Rencana agen")).not.toBeInTheDocument();
    expect(screen.queryByText("Ruru")).not.toBeInTheDocument();
    expect(screen.getByText("Alasan rencana")).toBeInTheDocument();
    expect(
      screen.getByText(/pesan meminta otp, jadi periksa narasi/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Mochi").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Pesan & rekayasa sosial").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Message Agent")).toBeInTheDocument();
    expect(screen.getByText("Poin temuan")).toBeInTheDocument();
    expect(screen.getByText("Pesan meminta kode OTP.")).toBeInTheDocument();
    expect(
      screen.getByText("Bank tidak meminta kode OTP lewat chat."),
    ).toBeInTheDocument();
    expect(screen.getByText("credential-request")).toBeInTheDocument();
    expect(screen.getByText("Jangan kirim kode OTP.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Permintaan OTP adalah indikator kredensial yang harus dilaporkan.",
      ),
    ).toBeInTheDocument();

    const process = screen.getByText("Proses agen").closest("details");
    expect(process?.hasAttribute("open")).toBe(true);
    const thoughts = screen.getByText("Pemikiran agen").closest("details");
    expect(thoughts?.hasAttribute("open")).toBe(false);

    const tools = screen.getByText(/proses tool/i).closest("details");
    expect(tools?.hasAttribute("open")).toBe(false);
    expect(screen.queryByText("tool:score_message")).not.toBeInTheDocument();
    expect(screen.getByText("skill:narrative-analysis")).toBeInTheDocument();
  });

  it("names the tools that actually ran and expands their process", async () => {
    const user = userEvent.setup();
    render(<ProcessTrace events={events} />);

    const summary = screen.getByText(/proses tool · score_message/i);
    const tools = summary.closest("details");
    expect(tools?.hasAttribute("open")).toBe(false);
    expect(screen.getByText(/1 panggilan · 1 ok/i)).toBeInTheDocument();

    await user.click(summary);
    expect(tools?.hasAttribute("open")).toBe(true);
    expect(screen.getByText('{"score":91}')).toBeInTheDocument();
    expect(screen.getByText(/ok · 2 ms/i)).toBeInTheDocument();
  });

  it("keeps descriptions out of the card and reveals them from the profile", async () => {
    const user = userEvent.setup();
    render(<ProcessTrace events={events} />);

    expect(screen.queryByText(/membaca nada pesan/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Membaca narasi dan mekanisme rekayasa sosial"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /apa yang dilakukan mochi/i }),
    );

    expect(await screen.findByText(/membaca nada pesan/i)).toBeInTheDocument();
    expect(screen.getByText("Kata kunci")).toBeInTheDocument();
  });

  it("does not list agents skipped by the deadline", () => {
    render(
      <ProcessTrace
        events={[
          ...events,
          event({
            type: "agent_start",
            runId: "run-1",
            seq: 10,
            at: 10,
            agent: "qris",
            label: "QRIS Agent",
            task: "Periksa jalur pembayaran.",
            skills: [],
            tools: [],
          }),
          event({
            type: "agent_result",
            runId: "run-1",
            seq: 11,
            at: 11,
            agent: "qris",
            label: "QRIS Agent",
            status: "dilewati",
            summary: "Dilewati karena batas waktu pemeriksaan.",
            findings: [],
            points: [],
            ms: 0,
          }),
        ]}
      />,
    );

    expect(screen.getByText(/agen dipanggil · 1/i)).toBeInTheDocument();
    expect(screen.queryByText("Ruru")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/dilewati karena batas waktu/i),
    ).not.toBeInTheDocument();
  });

  it("paints Lumina before the plan arrives", () => {
    render(
      <ProcessTrace
        events={[
          {
            type: "run_start",
            runId: "run-2",
            seq: 1,
            at: 1,
            question: "apakah ini penipuan?",
          },
        ]}
      />,
    );
    expect(screen.getByText("Lumina")).toBeInTheDocument();
    expect(screen.getByText(/membaca pesan/i)).toBeInTheDocument();
  });

  it("shows the consensus and the final score", () => {
    const score = {
      score: 78,
      risk: "tinggi" as const,
      signals: [
        {
          label: "Kelebihan transfer",
          weight: 0.5,
          evidence: "transfer berlebih",
          agent: "marketplace" as const,
          source: "consensus" as const,
        },
      ],
      modus: "jual-beli-palsu",
      advice: ["Jangan mengembalikan dana sebelum dana masuk."],
      relatedModule: 1,
      hardOverride: false,
      source: "consensus" as const,
      baselineScore: 0,
    };

    render(
      <ProcessTrace
        events={[
          event({
            type: "run_start",
            runId: "run-3",
            seq: 1,
            at: 1,
            question: "apakah ini penipuan?",
          }),
          event({
            type: "commander_say",
            runId: "run-3",
            seq: 2,
            at: 2,
            text: "Aku melihat pola kelebihan bayar.",
            focus: "overpayment",
            source: "model",
            ms: 5,
          }),
          event({
            type: "consensus",
            runId: "run-3",
            seq: 3,
            at: 3,
            groups: [
              {
                pattern: "overpayment-refund",
                agents: ["marketplace", "qris"],
                points: [
                  {
                    agent: "marketplace",
                    signal: "Kelebihan transfer",
                    point: "Transfer berlebih.",
                    pattern: "overpayment-refund",
                    quote: "transfer berlebih",
                  },
                  {
                    agent: "qris",
                    signal: "Refund QRIS",
                    point: "Minta refund.",
                    pattern: "overpayment-refund",
                    quote: "refund",
                  },
                ],
              },
            ],
          }),
          event({
            type: "score_decision",
            runId: "run-3",
            seq: 4,
            at: 4,
            result: score,
            baseline: { ...score, score: 0, risk: "bersih", signals: [] },
            rationale: "Dua agen sepakat.",
            source: "model",
          }),
        ]}
      />,
    );

    expect(screen.getByText(/2 agen sepakat/)).toBeInTheDocument();
    expect(screen.getByText(/Skor akhir 78\/100/)).toBeInTheDocument();
  });
});
