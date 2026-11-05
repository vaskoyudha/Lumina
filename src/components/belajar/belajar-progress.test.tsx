import { render, screen } from "@testing-library/react";
import { BelajarProgress } from "@/components/belajar/belajar-progress";
import { MODUS } from "@/lib/modus";
import { completeModule, loadProgress, saveProgress } from "@/lib/progress";

describe("BelajarProgress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows honest zero progress after mount, never before", async () => {
    render(<BelajarProgress />);
    expect(
      await screen.findByText(
        new RegExp(`0 dari ${MODUS.length} modul selesai`),
      ),
    ).toBeInTheDocument();
  });

  it("reports completed modules after mount", async () => {
    saveProgress(completeModule(loadProgress(), 10));
    render(<BelajarProgress />);
    expect(
      await screen.findByText(
        new RegExp(`1 dari ${MODUS.length} modul selesai`),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/penjaga apk/i)).toBeInTheDocument();
  });
});
