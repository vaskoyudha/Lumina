import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Features from "./Features";

describe("Features", () => {
  it("switches the gallery from the tab strip", async () => {
    const user = userEvent.setup();
    const { container } = render(<Features />);

    const ukurTabs = screen.getAllByRole("button", { name: "Ukur" });
    expect(ukurTabs[0]).toHaveAttribute("aria-pressed", "false");

    await user.click(ukurTabs[0]);

    for (const tab of ukurTabs) {
      expect(tab).toHaveAttribute("aria-pressed", "true");
    }
    expect(container.querySelector('[data-framer-name="BG 4"]')).toHaveStyle({
      opacity: 1,
    });
  });

  it("prints the Tanya slide as live code, not the raster reference", () => {
    const { container } = render(<Features />);

    expect(container.querySelector(".ask-preview")).not.toBeNull();
    expect(
      screen.getAllByText("Mau periksa apa hari ini?").length,
    ).toBeGreaterThan(0);
  });

  it("prints Periksa and Langkah as live code", async () => {
    const user = userEvent.setup();
    const { container } = render(<Features />);

    expect(container.querySelector(".periksa-preview")).not.toBeNull();
    expect(
      screen.getAllByText("Lihat bukti").length,
    ).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Langkah" })[0]);

    expect(container.querySelector(".langkah-preview")).not.toBeNull();
    expect(screen.getAllByText("Langkah tersusun").length).toBeGreaterThan(0);
    expect(container.querySelector('[data-framer-name="BG 3"]')).toHaveStyle({
      opacity: 1,
    });
  });

  it("advances the gallery with the caption arrows", async () => {
    const user = userEvent.setup();
    render(<Features />);

    const next = screen.getAllByLabelText("Pratinjau berikutnya")[0];
    await user.click(next);
    await user.click(next);
    await user.click(next);

    expect(screen.getAllByRole("button", { name: "Ukur" })[0]).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
