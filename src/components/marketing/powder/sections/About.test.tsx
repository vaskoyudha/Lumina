import { render, screen } from "@testing-library/react";
import About from "./About";

const RASTERS = [
  "D7e4TugadmJTFjHpPSKhXEtOnk",
  "egCROtkGjJt43Q9SunwaHjvGUL4",
  "jwCVtbSWlvsuvrIejVWwVB7mAU",
];

describe("About", () => {
  it("prints every card as live code, not the raster references", () => {
    const { container } = render(<About />);

    expect(container.querySelectorAll(".about-preview").length).toBe(3);
    expect(
      screen.getAllByText("Pesan ini minta OTP, tapi pengirimnya bukan bank.")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Pesan WhatsApp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Progres").length).toBeGreaterThan(0);

    for (const file of RASTERS) {
      expect(container.querySelector(`img[src*="${file}"]`)).toBeNull();
    }
  });
});
