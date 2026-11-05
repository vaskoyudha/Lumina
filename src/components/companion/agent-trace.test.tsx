import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentTraceCard } from "@/components/companion/agent-trace";
import type { AgentTrace } from "@/lib/contracts/agent-run";

const trace: AgentTrace = {
  totalMs: 0.42,
  stages: [
    {
      id: "message",
      label: "Message Agent",
      task: "Urgensi palsu, otoritas, iming-iming",
      status: "temuan",
      findings: 2,
      ms: 0.11,
    },
    {
      id: "link",
      label: "Link Agent",
      task: "Domain mirip merek resmi",
      status: "dilewati",
      findings: 0,
      ms: 0.02,
      note: "Tidak ada tautan pada pesan ini.",
    },
    {
      id: "voice",
      label: "Penyusun bahasa",
      task: "Menulis jawaban dari temuan",
      status: "berjalan",
      findings: 0,
      ms: 0,
    },
  ],
};

describe("AgentTraceCard", () => {
  it("summarises the run in the header", () => {
    render(<AgentTraceCard trace={trace} />);
    expect(screen.getByText(/3 pemeriksaan/i)).toBeInTheDocument();
    expect(screen.getByText(/0,4 ms/)).toBeInTheDocument();
  });

  it("lists every stage once opened", async () => {
    const user = userEvent.setup();
    render(<AgentTraceCard trace={trace} />);
    await user.click(screen.getByRole("button", { name: /lihat tahapan/i }));
    expect(screen.getByText("Message Agent")).toBeInTheDocument();
    expect(screen.getByText("Link Agent")).toBeInTheDocument();
    expect(
      screen.getByText(/Tidak ada tautan pada pesan ini/),
    ).toBeInTheDocument();
  });

  it("marks the stage that is still running", async () => {
    const user = userEvent.setup();
    render(<AgentTraceCard trace={trace} />);
    await user.click(screen.getByRole("button", { name: /lihat tahapan/i }));
    expect(screen.getByText("Penyusun bahasa").closest("li")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
