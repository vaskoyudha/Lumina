import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentRun } from "@/components/companion/agent-run";
import type { AgentStage, AgentTrace } from "@/lib/contracts/agent-run";
import type { ScoreResult } from "@/lib/contracts/score";

const stage = (
  over: Partial<AgentStage> & Pick<AgentStage, "id">,
): AgentStage => ({
  label: `${over.id} Agent`,
  task: "task",
  status: "selesai",
  findings: 0,
  ms: 1.2,
  ...over,
});

const trace: AgentTrace = {
  stages: [
    stage({ id: "message", status: "temuan", findings: 2, ms: 3 }),
    stage({ id: "link", status: "dilewati", note: "Tidak ada tautan." }),
    stage({ id: "identity", status: "selesai" }),
    stage({ id: "conversation", status: "selesai" }),
    stage({ id: "job", status: "dilewati", note: "Bukan tawaran kerja." }),
    stage({
      id: "marketplace",
      status: "dilewati",
      note: "Bukan percakapan jual-beli.",
    }),
    stage({ id: "qris", status: "dilewati", note: "Tidak ada payload QRIS." }),
    stage({ id: "evidence", status: "selesai" }),
    stage({
      id: "scoring",
      label: "Scoring Orchestrator",
      findings: 0,
      ms: 0.4,
    }),
    stage({ id: "voice", label: "Penyusun bahasa", status: "berjalan", ms: 0 }),
  ],
  totalMs: 12,
};

describe("AgentRun", () => {
  it("renders one orchestrator and one bubble per present stage", () => {
    render(<AgentRun trace={trace} live />);
    expect(screen.getByText(/orkestrator/i)).toBeInTheDocument();
    for (const id of [
      "message",
      "link",
      "identity",
      "conversation",
      "job",
      "marketplace",
      "qris",
      "evidence",
      "voice",
    ]) {
      expect(screen.getByTestId(`agent-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("agent-scoring")).not.toBeInTheDocument();
  });

  it("prints the real status for every bubble", () => {
    render(<AgentRun trace={trace} live />);
    expect(screen.getByTestId("agent-message")).toHaveAttribute(
      "data-status",
      "temuan",
    );
    expect(screen.getByTestId("agent-link")).toHaveAttribute(
      "data-status",
      "dilewati",
    );
    expect(screen.getByTestId("agent-voice")).toHaveAttribute(
      "data-status",
      "berjalan",
    );
  });

  it("renders the standing crew with every agent card", () => {
    render(<AgentRun trace={{ stages: [], totalMs: 0 }} />);

    expect(screen.getByText("8 agen siap")).toBeInTheDocument();
    expect(screen.getByText("Belum ada pemeriksaan")).toBeInTheDocument();
    for (const id of [
      "message",
      "link",
      "identity",
      "conversation",
      "job",
      "marketplace",
      "qris",
      "evidence",
    ]) {
      expect(screen.getByTestId(`agent-card-${id}`)).toHaveAttribute(
        "data-status",
        "menunggu",
      );
    }
  });

  it("mirrors each agent's live status on its crew card", () => {
    render(<AgentRun trace={trace} live />);

    expect(screen.getByTestId("agent-card-message")).toHaveAttribute(
      "data-status",
      "temuan",
    );
    expect(screen.getByTestId("agent-card-link")).toHaveAttribute(
      "data-status",
      "dilewati",
    );
    expect(screen.getByTestId("agent-card-evidence")).toHaveAttribute(
      "data-status",
      "selesai",
    );
  });

  it("prints the voice name once, not twice", () => {
    const settled: AgentTrace = {
      ...trace,
      stages: trace.stages.map((item) =>
        item.id === "voice" ? { ...item, status: "selesai", ms: 10_923 } : item,
      ),
    };
    render(<AgentRun trace={settled} />);
    const voice = screen.getByTestId("agent-voice");
    expect(within(voice).getAllByText("Penyusun bahasa")).toHaveLength(1);
  });

  it("prints a long duration in seconds so the row does not wrap", () => {
    const settled: AgentTrace = {
      ...trace,
      stages: trace.stages.map((item) =>
        item.id === "voice" ? { ...item, status: "selesai", ms: 10_923 } : item,
      ),
    };
    render(<AgentRun trace={settled} />);
    const voice = screen.getByTestId("agent-voice");
    expect(within(voice).getByText("10,9 s")).toBeInTheDocument();
    expect(within(voice).queryByText(/10\.923,0 ms/)).not.toBeInTheDocument();
  });

  it("shows the note for skipped stages", () => {
    render(<AgentRun trace={trace} live />);
    const link = screen.getByTestId("agent-link");
    expect(within(link).getByText(/tidak ada tautan/i)).toBeInTheDocument();
  });

  it("never says berhasil for a clean stage", () => {
    render(<AgentRun trace={trace} live />);
    expect(screen.queryByText(/berhasil/i)).not.toBeInTheDocument();
  });

  it("expands a bubble and keeps it open", async () => {
    const user = userEvent.setup();
    render(<AgentRun trace={trace} live />);
    const toggle = within(screen.getByTestId("agent-message")).getByRole(
      "button",
      {
        name: /message agent/i,
      },
    );
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("only the voice bubble may be running", () => {
    render(<AgentRun trace={trace} live />);
    const running = screen
      .getAllByText("Berjalan")
      .map((node) =>
        node.closest("[data-testid]")?.getAttribute("data-testid"),
      );
    expect(running).toEqual(["agent-voice"]);
    expect(screen.getByTestId("agent-voice")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("names a missing skip reason instead of hiding it", () => {
    const noNote: AgentTrace = {
      stages: [
        stage({ id: "message", status: "dilewati", findings: 0 }),
        stage({ id: "scoring", label: "Scoring Orchestrator" }),
      ],
      totalMs: 2,
    };
    render(<AgentRun trace={noNote} live={false} />);
    expect(screen.getByTestId("agent-message")).toHaveTextContent(
      /tidak ada alasan tercatat/i,
    );
  });

  it("never reports a failed run as complete", () => {
    const failed: AgentTrace = {
      stages: [
        stage({ id: "message", status: "gagal", note: "Mesin berhenti." }),
        stage({ id: "link", status: "selesai" }),
        stage({ id: "scoring", label: "Scoring Orchestrator" }),
      ],
      totalMs: 4,
    };
    const { container } = render(<AgentRun trace={failed} live={false} />);
    expect(container.querySelector("[data-run-state]")).toHaveAttribute(
      "data-run-state",
      "gagal",
    );
    expect(screen.getByText(/1 gagal/i)).toBeInTheDocument();
    expect(screen.queryByText(/berhasil/i)).not.toBeInTheDocument();
  });

  it("does not change status when time advances", () => {
    jest.useFakeTimers();
    render(<AgentRun trace={trace} live={false} />);
    const before = screen
      .getAllByTestId(/^agent-/)
      .map((node) => node.getAttribute("data-status"));
    jest.advanceTimersByTime(10_000);
    const after = screen
      .getAllByTestId(/^agent-/)
      .map((node) => node.getAttribute("data-status"));
    expect(after).toEqual(before);
    jest.useRealTimers();
  });

  it("switches off the entrance without remounting the bubbles", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<AgentRun trace={trace} live />);
    expect(container.querySelector("[data-motion-list]")).toHaveAttribute(
      "data-motion-list",
      "true",
    );

    const toggle = within(screen.getByTestId("agent-message")).getByRole(
      "button",
      {
        name: /message agent/i,
      },
    );
    await user.click(toggle);

    rerender(<AgentRun trace={trace} live={false} />);
    expect(container.querySelector("[data-motion-list]")).toHaveAttribute(
      "data-motion-list",
      "false",
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true"); // same node, still open
  });

  it("prints the honest status word for every kind of stage", () => {
    const mixed: AgentTrace = {
      stages: [
        stage({ id: "message", status: "temuan", findings: 2 }),
        stage({ id: "identity", status: "selesai", findings: 0 }),
        stage({ id: "job", status: "selesai", findings: 0 }),
        stage({
          id: "evidence",
          status: "selesai",
          findings: 0,
          note: "2 kutipan tercatat untuk laporan",
        }),
        stage({ id: "voice", label: "Penyusun bahasa", status: "selesai" }),
        stage({ id: "scoring", label: "Scoring Orchestrator" }),
      ],
      totalMs: 5,
    };
    render(<AgentRun trace={mixed} />);

    expect(
      within(screen.getByTestId("agent-message")).getByText("2 temuan"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("agent-identity")).getByText("Tidak melapor"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("agent-job")).getByText("Selesai · 0 temuan"),
    ).toBeInTheDocument();
    // Evidence counts quotes and voice writes language; neither "detects a
    // pattern", so neither may claim a detector's finding count.
    const evidence = screen.getByTestId("agent-evidence");
    expect(within(evidence).getByText("Selesai")).toBeInTheDocument();
    expect(within(evidence).queryByText(/0 temuan/)).not.toBeInTheDocument();
    const voice = screen.getByTestId("agent-voice");
    expect(within(voice).getByText("Selesai")).toBeInTheDocument();
    expect(within(voice).queryByText(/0 temuan/)).not.toBeInTheDocument();
  });

  it("never gives a non-reporting or finding stage the success glyph", () => {
    const mixed: AgentTrace = {
      stages: [
        stage({ id: "message", status: "temuan", findings: 2 }),
        stage({ id: "identity", status: "selesai", findings: 0 }),
        stage({ id: "job", status: "selesai", findings: 0 }),
        stage({ id: "scoring", label: "Scoring Orchestrator" }),
      ],
      totalMs: 5,
    };
    render(<AgentRun trace={mixed} />);

    expect(
      screen
        .getByTestId("agent-message")
        .querySelector('[data-glyph="finding"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByTestId("agent-identity")
        .querySelector('[data-glyph="quiet"]'),
    ).not.toBeNull();
    expect(
      screen.getByTestId("agent-job").querySelector('[data-glyph="check"]'),
    ).not.toBeNull();
  });

  it("counts stage statuses without overlap and subtracts the voice time", () => {
    const settled: AgentTrace = {
      ...trace,
      stages: trace.stages.map((item) =>
        item.id === "voice" ? { ...item, status: "selesai", ms: 2.5 } : item,
      ),
      totalMs: 12,
    };
    const { container } = render(<AgentRun trace={settled} />);
    expect(container.querySelector("[data-run-state]")).toBeInTheDocument();
    const summary = screen.getByTestId("agent-summary");

    // 3 selesai + 1 dengan temuan + 4 dilewati = 8 agents, and 12 - 2.5 = 9.5.
    for (const chip of [
      "3 selesai",
      "1 dengan temuan",
      "4 dilewati",
      "2 temuan",
      "9,5 ms",
    ]) {
      expect(within(summary).getByText(chip)).toBeInTheDocument();
    }
  });

  it("announces the settled summary once the run stops", () => {
    const settled: AgentTrace = {
      ...trace,
      stages: trace.stages.map((item) =>
        item.id === "voice" ? { ...item, status: "selesai", ms: 4 } : item,
      ),
    };
    const { rerender } = render(<AgentRun trace={settled} live />);
    rerender(<AgentRun trace={settled} live={false} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "4 agen selesai, 4 dilewati, 2 temuan.",
    );
  });

  it("shows a detector only its own weighted signals", async () => {
    const user = userEvent.setup();
    const result: ScoreResult = {
      score: 70,
      risk: "tinggi",
      signals: [
        {
          label: "Pola pesan menekan",
          weight: 0.5,
          evidence: "buruan",
          agent: "message",
        },
        {
          label: "Sinyal pasar unik",
          weight: 0.4,
          evidence: "transfer pribadi",
          agent: "marketplace",
        },
        {
          label: "Placeholder nol",
          weight: 0,
          evidence: "tidak ada",
          agent: "message",
        },
      ],
      modus: "tidak-dikenali",
      advice: [],
      relatedModule: null,
      hardOverride: false,
    };
    render(<AgentRun trace={trace} live={false} result={result} />);

    const message = screen.getByTestId("agent-message");
    await user.click(
      within(message).getByRole("button", { name: /message agent/i }),
    );
    expect(within(message).getByText("Ciri yang dicek")).toBeInTheDocument();
    expect(within(message).getByText("Pola pesan menekan")).toBeInTheDocument();
    expect(
      within(message).queryByText("Sinyal pasar unik"),
    ).not.toBeInTheDocument();
    expect(
      within(message).queryByText("Placeholder nol"),
    ).not.toBeInTheDocument();

    const market = screen.getByTestId("agent-marketplace");
    await user.click(
      within(market).getByRole("button", { name: /marketplace agent/i }),
    );
    expect(within(market).getByText("Sinyal pasar unik")).toBeInTheDocument();
    expect(
      within(market).queryByText("Pola pesan menekan"),
    ).not.toBeInTheDocument();
  });

  it("renders the full skip or failure note in the expanded body", async () => {
    const user = userEvent.setup();
    const note = "Model terlalu lambat menjawab; jawaban disusun dari templat.";
    const failed: AgentTrace = {
      stages: [
        stage({ id: "message", status: "gagal", note }),
        stage({ id: "scoring", label: "Scoring Orchestrator" }),
      ],
      totalMs: 4,
    };
    render(<AgentRun trace={failed} live={false} />);

    const bubble = screen.getByTestId("agent-message");
    const toggle = within(bubble).getByRole("button", {
      name: /message agent/i,
    });
    await user.click(toggle);

    const panelId = toggle.getAttribute("aria-controls");
    expect(panelId).not.toBeNull();
    const body = document.getElementById(panelId as string);
    expect(body).not.toBeNull();
    expect(within(body as HTMLElement).getByText(note)).toBeInTheDocument();
  });

  it("renders job-search as a non-detector row", () => {
    const withSearch: AgentTrace = {
      ...trace,
      stages: [
        ...trace.stages,
        stage({
          id: "job-search",
          label: "Pencari Lowongan",
          status: "selesai",
          findings: 0,
          ms: 3,
          note: "2 lowongan cocok",
        }),
      ],
      totalMs: 15,
    };
    render(<AgentRun trace={withSearch} />);
    const row = screen.getByTestId("agent-job-search");
    expect(within(row).getByText("Pencari Lowongan")).toBeInTheDocument();
    // It searches the scan, it does not inspect the message: no "0 temuan".
    expect(within(row).queryByText(/0 temuan/)).not.toBeInTheDocument();
    expect(within(row).getByText("Selesai")).toBeInTheDocument();
    expect(within(row).getByText("2 lowongan cocok")).toBeInTheDocument();
  });

  it("subtracts voice and job-search from the engine time", () => {
    const withSearch: AgentTrace = {
      stages: [
        stage({ id: "message", status: "selesai", ms: 1 }),
        stage({
          id: "voice",
          label: "Penyusun bahasa",
          status: "selesai",
          ms: 5,
        }),
        stage({
          id: "job-search",
          label: "Pencari Lowongan",
          status: "selesai",
          ms: 2,
        }),
      ],
      totalMs: 8,
    };
    render(<AgentRun trace={withSearch} />);
    // 8 - 5 - 2 = 1 ms of detector work.
    const summary = screen.getByTestId("agent-summary");
    for (const chip of ["1 selesai", "0 dilewati", "0 temuan", "1,0 ms"]) {
      expect(within(summary).getByText(chip)).toBeInTheDocument();
    }
  });
});
