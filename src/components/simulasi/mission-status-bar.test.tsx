import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MissionStatusBar } from "@/components/simulasi/mission-status-bar";

describe("MissionStatusBar", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the mission identity, three steps, and the clock", () => {
    render(<MissionStatusBar />);

    expect(screen.getByText("Simulasi Keamanan Digital")).toBeInTheDocument();
    expect(
      screen.getByText("Pahami risiko, ambil keputusan yang tepat."),
    ).toBeInTheDocument();

    const steps = screen.getByRole("list", { name: "Tahap simulasi" });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
    expect(within(steps).getByText("Mulai")).toBeInTheDocument();
    expect(within(steps).getByText("Keputusan")).toBeInTheDocument();
    expect(within(steps).getByText("Hasil")).toBeInTheDocument();
    expect(within(steps).getByText("Mulai").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );

    expect(
      screen.getByRole("timer", { name: "Sisa waktu 04:32" }),
    ).toBeInTheDocument();
  });

  it("counts down while running and freezes when paused", () => {
    render(<MissionStatusBar budgetSeconds={3} />);
    expect(screen.getByText("00:03")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:02")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText("00:02")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:01")).toBeInTheDocument();
  });

  it("stops at zero instead of going negative", () => {
    render(<MissionStatusBar budgetSeconds={1} />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText("00:00")).toBeInTheDocument();
  });
});
