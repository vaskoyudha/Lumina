import { render, waitFor } from "@testing-library/react";
import WhyScrollDrift from "@/components/marketing/powder/runtime/WhyScrollDrift";

function WhyFixture() {
  return (
    <div className="pw-why-runway" data-pw-why-runway data-testid="runway">
      <section className="framer-2ckbn" data-pw-drift="why" data-testid="why">
        <div className="framer-1n1ykuh" data-testid="intro">
          <a href="/" className="framer-1uiucns" data-testid="chip">
            Kenapa Lumina
          </a>
          <h2 data-testid="heading">Kenapa Lumina</h2>
        </div>
        <div className="framer-1mgirvw-container" data-testid="stage">
          <div className="pw-why-row" data-testid="row" />
        </div>
      </section>
    </div>
  );
}

function setViewportHeight(value: number) {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    get: () => value,
  });
}

function setViewportWidth(value: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => value,
  });
}

function rect(top: number, height: number, x = 0, width = 0): DOMRect {
  return {
    top,
    bottom: top + height,
    height,
    left: x,
    right: x + width,
    width,
    x,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

const SECTION_HEIGHT = 800;
const SECTION_WIDTH = 1440;
const STAGE_LEFT = 180;
const STAGE_WIDTH = 1080;
const ROW_WIDTH = 2104;
const VISIBLE_WIDTH = SECTION_WIDTH - STAGE_LEFT;
const TRAVEL = ROW_WIDTH - VISIBLE_WIDTH;

function mount() {
  const view = render(
    <>
      <WhyFixture />
      <WhyScrollDrift />
    </>,
  );

  const runway = view.getByTestId("runway");
  const why = view.getByTestId("why");
  const intro = view.getByTestId("intro");
  const heading = view.getByTestId("heading");
  const stage = view.getByTestId("stage");
  const row = view.getByTestId("row");

  let runwayTop = 0;
  runway.getBoundingClientRect = () => rect(runwayTop, SECTION_HEIGHT);
  why.getBoundingClientRect = () => rect(0, SECTION_HEIGHT, 0, SECTION_WIDTH);
  intro.getBoundingClientRect = () => rect(150, 200);
  heading.getBoundingClientRect = () => rect(190, 120);
  stage.getBoundingClientRect = () => rect(350, 400, STAGE_LEFT, STAGE_WIDTH);
  row.getBoundingClientRect = () => rect(350, 400, STAGE_LEFT, STAGE_WIDTH);
  Object.defineProperty(why, "offsetHeight", {
    configurable: true,
    get: () => SECTION_HEIGHT,
  });
  Object.defineProperty(row, "scrollWidth", {
    configurable: true,
    get: () => ROW_WIDTH,
  });

  const measure = () => window.dispatchEvent(new Event("resize"));
  const at = (top: number) => {
    runwayTop = top;
    window.dispatchEvent(new Event("scroll"));
  };

  return { ...view, runway, why, intro, measure, at };
}

describe("WhyScrollDrift", () => {
  beforeEach(() => {
    setViewportWidth(1440);
    setViewportHeight(900);
  });

  it("pins the section inside a runway sized to the row's travel", async () => {
    const { runway, why, measure } = mount();
    measure();

    await waitFor(() => {
      // 2104px of row against 1260px of visible section -> 844px of travel.
      expect(runway.style.height).toBe(`${SECTION_HEIGHT + TRAVEL}px`);
    });
    expect(runway.dataset.pwPinned).toBe("true");
    expect(why.style.getPropertyValue("--pw-why-top")).toBe("-100px");
  });

  it("centres the card row on tall viewports", async () => {
    setViewportHeight(1200);
    const { why, intro, measure } = mount();
    measure();

    await waitFor(() => {
      // Row spans 350..750 -> centre 550; 600 - 550 = 50.
      expect(why.style.getPropertyValue("--pw-why-top")).toBe("50px");
    });
    // There is room below the nav, so the intro is left alone.
    expect(intro.style.opacity).toBe("");
  });

  it("centres the card row on short viewports", async () => {
    setViewportHeight(500);
    const { why, measure } = mount();
    measure();

    await waitFor(() => {
      // Row centre 550; 250 - 550 = -300, letting the heading pass under nav.
      expect(why.style.getPropertyValue("--pw-why-top")).toBe("-300px");
    });
  });

  it("centres the row instead of keeping a clipped heading", async () => {
    setViewportHeight(780);
    const { why, intro, measure, at } = mount();
    measure();
    at(-160);

    await waitFor(() => {
      // Centring is -160; lifting the section enough to clear the nav (-118)
      // would cost 42px of card height, so the row stays centred.
      expect(why.style.getPropertyValue("--pw-why-top")).toBe("-160px");
    });
    await waitFor(() => {
      expect(intro.style.opacity).toBe("0");
    });
  });

  it("fades the intro out when the pinned heading would sit under the nav", async () => {
    setViewportHeight(500);
    const { intro, measure, at } = mount();
    measure();
    // Pin is -300 and the heading sits at 190, so at the pin it lands at -110,
    // under the 72px nav line; the approach fades it out over 180px.
    at(-300 + 90);

    await waitFor(() => {
      expect(intro.style.opacity).toBe("0.5");
    });

    at(-300);
    await waitFor(() => {
      expect(intro.style.opacity).toBe("0");
    });
  });

  it("holds the row at rest before the section reaches the pin", async () => {
    const { why, measure, at } = mount();
    measure();
    at(500);

    await waitFor(() => {
      expect(why.style.getPropertyValue("--pw-drift")).toBe("0.00px");
    });
  });

  it("advances the row left as the pin is spent", async () => {
    const { why, measure, at } = mount();
    measure();
    // The pin sits at -100 (row centred), so half the travel is -100 - TRAVEL/2.
    at(-100 - TRAVEL / 2);

    await waitFor(() => {
      expect(why.style.getPropertyValue("--pw-drift")).toBe(
        `-${(TRAVEL / 2).toFixed(2)}px`,
      );
    });
  });

  it("finishes the travel when the section unpins", async () => {
    const { why, measure, at } = mount();
    measure();
    at(-2000);

    await waitFor(() => {
      expect(why.style.getPropertyValue("--pw-drift")).toBe(
        `-${TRAVEL.toFixed(2)}px`,
      );
    });
  });

  it("does not pin when the row already fits the section", async () => {
    const { runway, measure } = mount();
    const row = document.querySelector<HTMLElement>(".pw-why-row");
    if (!row) throw new Error("row not rendered");
    Object.defineProperty(row, "scrollWidth", {
      configurable: true,
      get: () => VISIBLE_WIDTH,
    });
    measure();

    await waitFor(() => {
      expect(runway.style.height).toBe("");
    });
    expect(runway.dataset.pwPinned).toBeUndefined();
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

    const { runway, why, measure } = mount();
    measure();

    expect(runway.style.height).toBe("");
    expect(runway.dataset.pwPinned).toBeUndefined();
    expect(why.style.getPropertyValue("--pw-drift")).toBe("");

    window.matchMedia = original;
  });

  it("clears the pin and offset on unmount", async () => {
    const { runway, why, measure, unmount } = mount();
    measure();

    await waitFor(() => {
      expect(runway.style.height).toBe(`${SECTION_HEIGHT + TRAVEL}px`);
    });

    unmount();

    expect(runway.style.height).toBe("");
    expect(runway.dataset.pwPinned).toBeUndefined();
    expect(why.style.getPropertyValue("--pw-drift")).toBe("");
    expect(why.style.getPropertyValue("--pw-why-top")).toBe("");
  });
});
