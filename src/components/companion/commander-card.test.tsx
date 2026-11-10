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
    expect(screen.getByText(/membaca pesan/i)).toBeInTheDocument();
  });

  it("shows the announcement and the called count", () => {
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
    expect(screen.getByText(/menyiapkan 2 agen/i)).toBeInTheDocument();
  });
});
