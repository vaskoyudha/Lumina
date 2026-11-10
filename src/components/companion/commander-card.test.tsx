import { render, screen } from "@testing-library/react";
import { CommanderCard } from "@/components/companion/commander-card";

const agents = [
  {
    agent: "message" as const,
    task: "Periksa narasi.",
    skills: [],
    tools: [],
  },
  {
    agent: "qris" as const,
    task: "Periksa pembayaran.",
    skills: [],
    tools: [],
  },
];

describe("CommanderCard", () => {
  it("shows Lumina reading before any announcement", () => {
    render(<CommanderCard phase="reading" />);
    expect(screen.getByText("Lumina")).toBeInTheDocument();
    expect(screen.getByText("Komandan")).toBeInTheDocument();
    expect(screen.getByText(/membaca pesan/i)).toBeInTheDocument();
  });

  it("names the agents Lumina delegates to", () => {
    render(
      <CommanderCard
        phase="preparing"
        announcement="Saya melihat pola permintaan OTP. Saya akan memanggil agen yang relevan."
        agents={agents}
        source="model"
      />,
    );
    expect(
      screen.getByText(/saya melihat pola permintaan otp/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/mendelegasikan ke mochi dan ruru/i),
    ).toBeInTheDocument();
  });

  it("keeps the delegation visible when the run stops short", () => {
    render(<CommanderCard phase="stopped" agents={agents} />);
    expect(
      screen.getByText(/mendelegasikan ke mochi dan ruru/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ringkasan tidak tersedia/i)).toBeInTheDocument();
  });

  it("counts elapsed time while it is still reading", () => {
    render(<CommanderCard phase="reading" startedAt={Date.now() - 1500} />);
    expect(screen.getByText(/detik/)).toBeInTheDocument();
  });

  it("drops the counter once the run is settled", () => {
    render(<CommanderCard phase="done" startedAt={Date.now() - 1500} />);
    expect(screen.queryByText(/detik/)).not.toBeInTheDocument();
  });
});
