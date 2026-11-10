import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionQuickCards } from "@/components/companion/quick-cards";

it("does not invent previous agent activity and greets the signed-in name", () => {
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
  expect(
    screen.getByText(/Belum ada pemeriksaan di tab ini/),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/2 menit yang lalu|1 jam yang lalu|1 hari yang lalu/),
  ).not.toBeInTheDocument();
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
