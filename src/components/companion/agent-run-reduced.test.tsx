import { render, screen } from "@testing-library/react";
import { AgentRun } from "@/components/companion/agent-run";
import type { AgentStage, AgentTrace } from "@/lib/contracts/agent-run";

jest.mock("motion/react", () => ({
  ...jest.requireActual("motion/react"),
  useReducedMotion: () => true,
}));

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

it("keeps the same tree and drops the spinner under reduced motion", () => {
  const { container } = render(<AgentRun trace={trace} live />);
  expect(container.querySelector("[data-motion-list]")).toHaveAttribute(
    "data-motion-list",
    "false",
  );
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(screen.getAllByText("Berjalan")).toHaveLength(1);
});
