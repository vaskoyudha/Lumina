import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { buildPanelLedger } from "@/components/companion/panel-ledger";
import type { AgentTrace } from "@/lib/contracts/agent-run";
import type { Signal } from "@/lib/contracts/score";
import { scoreWithTrace } from "@/lib/scoring/score";

const APK_MESSAGE =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.";

const BENIGN =
  "besok pagi aku mau ke kampus lebih awal untuk mengurus surat keterangan aktif kuliah, lalu siangnya mampir ke perpustakaan mengembalikan buku yang sudah lewat tenggat dua hari.";

const positive = (signals: readonly Signal[]) =>
  signals.filter((signal) => signal.weight > 0);

const withStage = (
  trace: AgentTrace,
  id: string,
  patch: Partial<AgentTrace["stages"][number]>,
): AgentTrace => ({
  ...trace,
  stages: trace.stages.map((stage) =>
    stage.id === id ? { ...stage, ...patch } : stage,
  ),
});

describe("buildPanelLedger", () => {
  it("accounts for every agent and credits findings to their producers", () => {
    const { result, trace } = scoreWithTrace({ text: APK_MESSAGE });
    const ledger = buildPanelLedger(
      AGENT_SEQUENCE,
      trace,
      positive(result.signals),
    );

    expect(ledger.agents).toHaveLength(AGENT_SEQUENCE.length);
    expect(
      ledger.findingAgents.some((agent) => agent.agent === "message"),
    ).toBe(true);

    for (const agent of ledger.findingAgents) {
      expect(agent.count).toBeGreaterThan(0);
      expect(agent.findings).toHaveLength(agent.count);
    }

    expect(
      ledger.counts.checked + ledger.counts.live + ledger.counts.pending,
    ).toBe(AGENT_SEQUENCE.length);
  });

  it("never turns a clean run into a finding", () => {
    const { result, trace } = scoreWithTrace({ text: BENIGN });
    const ledger = buildPanelLedger(
      AGENT_SEQUENCE,
      trace,
      positive(result.signals),
    );

    expect(ledger.findingAgents).toHaveLength(0);
    for (const agent of ledger.agents) {
      expect(["clean", "no_object", "failed", "pending"]).toContain(
        agent.outcome,
      );
    }
  });

  it("keeps a failed stage out of the clean group and preserves its note", () => {
    const { result, trace } = scoreWithTrace({ text: BENIGN });
    const failed = withStage(trace, "message", {
      status: "gagal",
      note: "Detektor berhenti.",
    });
    const ledger = buildPanelLedger(
      AGENT_SEQUENCE,
      failed,
      positive(result.signals),
    );

    const message = ledger.failedAgents.find(
      (agent) => agent.agent === "message",
    );
    expect(message).toBeDefined();
    expect(message?.note).toBe("Detektor berhenti.");
  });

  it("marks a running detector as live, not clean", () => {
    const { result, trace } = scoreWithTrace({ text: BENIGN });
    const running = withStage(trace, "message", { status: "berjalan" });
    const ledger = buildPanelLedger(
      AGENT_SEQUENCE,
      running,
      positive(result.signals),
    );

    expect(
      ledger.liveAgents.find((agent) => agent.agent === "message")?.outcome,
    ).toBe("live");
  });

  it("shows findings even without a trace, but invents no coverage", () => {
    const { result } = scoreWithTrace({ text: APK_MESSAGE });
    const ledger = buildPanelLedger(
      AGENT_SEQUENCE,
      null,
      positive(result.signals),
    );

    expect(
      ledger.findingAgents.some((agent) => agent.agent === "message"),
    ).toBe(true);
    expect(ledger.counts.checked).toBe(0);
    expect(ledger.counts.pending).toBe(
      AGENT_SEQUENCE.length - ledger.findingAgents.length,
    );
  });

  it("keeps findings whose agent is outside the detector sequence separate", () => {
    const signal: Signal = {
      label: "Temuan sintesis",
      weight: 0.5,
      evidence: "bukti",
      agent: "scoring",
    };
    const ledger = buildPanelLedger(AGENT_SEQUENCE, null, [signal]);

    expect(ledger.otherFindings).toEqual([signal]);
    expect(ledger.agents.some((agent) => agent.findings.includes(signal))).toBe(
      false,
    );
  });
});
