import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentRun } from "@/components/companion/agent-run";
import type { AgentStage, AgentTrace } from "@/lib/contracts/agent-run";

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
});
