import { render, screen } from "@testing-library/react";
import { BelajarProgress } from "@/components/belajar/belajar-progress";
import { completeModule, loadProgress, saveProgress } from "@/lib/progress";

describe("BelajarProgress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stays silent before mount and with no stored progress", () => {
    render(<BelajarProgress />);
    expect(
      screen.queryByText(/selesai di perangkat ini/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/dari 12 modul selesai/i),
    ).not.toBeInTheDocument();
  });

  it("reports completed modules after mount", async () => {
    saveProgress(completeModule(loadProgress(), 10));
    render(<BelajarProgress />);
    expect(
      await screen.findByText(/1 dari 12 modul selesai/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/penjaga apk/i)).toBeInTheDocument();
  });
});
