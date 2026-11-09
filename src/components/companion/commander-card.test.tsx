import { render, screen } from "@testing-library/react";
import { CommanderCard } from "@/components/companion/commander-card";

describe("CommanderCard", () => {
  it("shows Lumina reading before any announcement", () => {
    render(<CommanderCard phase="reading" />);
    expect(screen.getByText("Lumina")).toBeInTheDocument();
    expect(screen.getByText("Komandan")).toBeInTheDocument();
    expect(screen.getByText(/membaca pesan/i)).toBeInTheDocument();
  });

  it("announces the pattern without naming uncalled agents", () => {
    render(
      <CommanderCard
        phase="preparing"
        announcement="Saya melihat pola permintaan OTP. Saya akan memanggil agen yang relevan."
        source="model"
      />,
    );
    expect(
      screen.getByText(/saya melihat pola permintaan otp/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Menyiapkan agen")).toBeInTheDocument();
    expect(screen.queryByText(/mochi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ruru/i)).not.toBeInTheDocument();
  });

  it("shows agents working once delegation starts", () => {
    render(<CommanderCard phase="delegating" startedAt={Date.now() - 1500} />);
    expect(screen.getByText("Menjalankan agen")).toBeInTheDocument();
    expect(screen.getByText(/detik/)).toBeInTheDocument();
  });

  it("explains a run that stopped before synthesizing", () => {
    render(<CommanderCard phase="stopped" />);
    expect(screen.getByText(/berhenti sebelum selesai/i)).toBeInTheDocument();
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
