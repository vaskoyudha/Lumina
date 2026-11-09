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
      screen.getAllByText("What's blocking the Acme renewal?").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Taylor Smith").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Trends").length).toBeGreaterThan(0);

    for (const file of RASTERS) {
      expect(container.querySelector(`img[src*="${file}"]`)).toBeNull();
    }
  });
});
