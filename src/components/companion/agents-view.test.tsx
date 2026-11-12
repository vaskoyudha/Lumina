import { render, screen, within } from "@testing-library/react";
import { AgentsView } from "@/components/companion/agents-view";
import type { AgentRunSummary } from "@/lib/orchestrator/summary";

const run: AgentRunSummary = {
  runId: "run-1",
  modus: "jual-beli",
  band: "tinggi",
  plannerSource: "model",
  totalMs: 2400,
  agents: [
    { id: "message", label: "Message Agent", status: "selesai", ms: 800 },
    { id: "qris", label: "QRIS Agent", status: "selesai", ms: 900 },
  ],
};

const props = {
  onSelect: jest.fn(),
  onExport: jest.fn(),
  onCopyLink: jest.fn(),
};

describe("AgentsView · latest run", () => {
  it("shows the last signed-in run", () => {
    render(<AgentsView {...props} latestRun={run} />);
    const card = screen.getByRole("region", { name: "Pemeriksaan terakhir" });

    expect(card).toBeInTheDocument();
    expect(within(card).getByText("Mochi")).toBeInTheDocument();
    expect(within(card).getByText("Ruru")).toBeInTheDocument();
    expect(within(card).getByText(/2,4 s/)).toBeInTheDocument();
  });

  it("keeps the static view when there is no run", () => {
    render(<AgentsView {...props} />);
    expect(screen.queryByText("Pemeriksaan terakhir")).not.toBeInTheDocument();
    expect(screen.getByText("Agen pemeriksa")).toBeInTheDocument();
  });
});
