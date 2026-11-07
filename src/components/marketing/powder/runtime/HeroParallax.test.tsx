import { render, waitFor } from "@testing-library/react";
import HeroParallax from "@/components/marketing/powder/runtime/HeroParallax";

function HeroFixture() {
  return (
    <section className="framer-x2ps8j">
      <div className="framer-u991jm" data-testid="far" />
      <div className="framer-f7ktf5" data-testid="near" />
      <div className="framer-dqdt72" data-testid="card" />
    </section>
  );
}

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => value,
  });
}

function scrollTo(value: number) {
  setScrollY(value);
  window.dispatchEvent(new Event("scroll"));
}

describe("HeroParallax", () => {
  it("trails each hero layer at the published site's scroll ratios", async () => {
    setScrollY(0);

    const { getByTestId } = render(
      <>
        <HeroFixture />
        <HeroParallax />
      </>,
    );

    scrollTo(600);

    await waitFor(() => {
      expect(getByTestId("far").style.getPropertyValue("--pw-parallax")).toBe(
        "186.00px",
      );
      expect(getByTestId("near").style.getPropertyValue("--pw-parallax")).toBe(
        "102.00px",
      );
      expect(getByTestId("card").style.getPropertyValue("--pw-parallax")).toBe(
        "120.00px",
      );
    });
  });

  it("holds still when the reader asks for reduced motion", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;

    setScrollY(0);

    const { getByTestId } = render(
      <>
        <HeroFixture />
        <HeroParallax />
      </>,
    );

    scrollTo(600);

    expect(getByTestId("far").style.getPropertyValue("--pw-parallax")).toBe("");
    expect(getByTestId("card").style.getPropertyValue("--pw-parallax")).toBe(
      "",
    );

    window.matchMedia = original;
  });

  it("clears the offset on unmount", async () => {
    setScrollY(0);

    const { getByTestId, unmount } = render(
      <>
        <HeroFixture />
        <HeroParallax />
      </>,
    );
    const far = getByTestId("far");

    scrollTo(600);
    await waitFor(() => {
      expect(far.style.getPropertyValue("--pw-parallax")).toBe("186.00px");
    });

    unmount();

    expect(far.style.getPropertyValue("--pw-parallax")).toBe("");
  });
});
