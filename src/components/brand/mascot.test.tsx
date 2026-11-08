import { render } from "@testing-library/react";
import { Mascot } from "./mascot";

describe("Mascot", () => {
  it("renders the animated APNG plus a static reduced-motion frame", () => {
    const { container } = render(<Mascot className="h-10 w-10" />);
    const images = Array.from(container.querySelectorAll("img"));

    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "/brand/mascot/mascot-v1.apng");
    expect(images[0]).toHaveClass("motion-reduce:hidden");
    expect(images[1]).toHaveAttribute("src", "/brand/mascot/mascot-v1.png");
    expect(images[1]).toHaveClass("motion-reduce:block");
  });

  it("adds the ambient float, halo, and bloom when effect is on", () => {
    const { container } = render(<Mascot effect />);

    expect(container.querySelector(".mascot-float")).not.toBeNull();
    expect(container.querySelector(".mascot-halo")).not.toBeNull();
    expect(container.querySelector(".mascot-bloom")).not.toBeNull();
  });
});
