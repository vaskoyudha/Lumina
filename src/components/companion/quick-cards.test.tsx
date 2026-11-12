import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionQuickCards } from "@/components/companion/quick-cards";

it("shows a ready roster instead of inventing previous activity", () => {
  render(
    <CompanionQuickCards
      name="Rina"
      onFeature={jest.fn()}
      onOpenHistory={jest.fn()}
      onResume={jest.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Mau periksa apa, Rina?" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Belum ada riwayat di tab ini/)).toBeInTheDocument();
  expect(screen.getAllByText("Siap memeriksa")).toHaveLength(4);
  expect(screen.queryByText(/Selesai ·/)).not.toBeInTheDocument();
  expect(
    screen.queryByText(/2 menit yang lalu|1 jam yang lalu|1 hari yang lalu/),
  ).not.toBeInTheDocument();
  expect(
    screen
      .getByText("Mochi")
      .closest("button")
      ?.querySelector(".bg-agent-message-soft"),
  ).not.toBeNull();
  expect(
    screen
      .getByText("Lala")
      .closest("button")
      ?.querySelector(".bg-agent-marketplace-soft"),
  ).not.toBeNull();
});
it("shows a measured run and reopens the conversation that produced it", async () => {
  const resume = jest.fn();
  const user = userEvent.setup();
  render(
    <CompanionQuickCards
      history={[{ id: "message", key: "turn-1", sessionId: 17, ms: 4.4 }]}
      onFeature={jest.fn()}
      onOpenHistory={jest.fn()}
      onResume={resume}
    />,
  );
  expect(screen.getByText("Selesai · 4 ms")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Menu riwayat Mochi" }));
  await user.click(screen.getByRole("button", { name: "Buka percakapan" }));
  expect(resume).toHaveBeenCalledWith(17);
});
it("labels a saved account run and hides the resume action", async () => {
  const user = userEvent.setup();
  render(
    <CompanionQuickCards
      history={[
        {
          id: "message",
          key: "run-saved-message",
          sessionId: -1,
          ms: 9000,
          source: "akun",
        },
      ]}
      onFeature={jest.fn()}
      onOpenHistory={jest.fn()}
      onResume={jest.fn()}
    />,
  );
  expect(
    screen.getByText("Pemeriksaan terakhir · 9000 ms"),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Menu riwayat Mochi" }));
  expect(
    screen.getByRole("button", { name: "Lihat ringkasan" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Buka percakapan" }),
  ).not.toBeInTheDocument();
});
