import { render, screen } from "@testing-library/react";
import { ProcessTrace } from "@/components/companion/process-trace";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";

function event<T extends OrchestratorEvent["type"]>(
  value: Extract<OrchestratorEvent, { type: T }>,
): OrchestratorEvent {
  return value;
}

const events: OrchestratorEvent[] = [
  event({
    type: "plan",
    runId: "run-1",
    seq: 1,
    at: 1,
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
    seq: 2,
    at: 2,
    agent: "message",
    label: "Message Agent",
    task: "Membaca narasi dan mekanisme rekayasa sosial",
    skills: ["narrative-analysis"],
    tools: ["score_message"],
  }),
  event({
    type: "tool_call",
    runId: "run-1",
    seq: 3,
    at: 3,
    agent: "message",
    callId: "call-1",
    tool: "score_message",
    args: {},
  }),
  event({
    type: "tool_result",
    runId: "run-1",
    seq: 4,
    at: 4,
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
    seq: 5,
    at: 5,
    agent: "message",
    text: "Permintaan OTP adalah indikator kredensial yang harus dilaporkan.",
  }),
  event({
    type: "agent_result",
    runId: "run-1",
    seq: 6,
    at: 6,
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
    seq: 7,
    at: 7,
    agent: "synthesizer",
    text: "Pesan ini berisiko tinggi.",
    ms: 5,
  }),
];

describe("ProcessTrace", () => {
  it("shows the identity profile, points, and hidden thoughts", () => {
    render(<ProcessTrace events={events} />);

    expect(screen.getByText("Proses agen")).toBeInTheDocument();
    expect(screen.getByText("Rencana koordinator")).toBeInTheDocument();
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
  });
});
