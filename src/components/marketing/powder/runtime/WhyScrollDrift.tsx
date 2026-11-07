"use client";

import "./why-scroll-drift.css";
import { useEffect } from "react";

/*
 * The reference "Why" carousel keeps cards beyond the stage's right edge. We
 * turn it into a pinned horizontal scroll: the runway grows to hold the row's
 * remaining width, the section sticks while that distance is spent, and the
 * row advances left so the later cards come into view. Scrolling up replays it
 * backwards, and the section releases once the row has finished travelling.
 *
 * The pin is centred on the card row itself, not on the section box or the
 * heading: the section carries extra bottom padding and controls, and the
 * heading is tall, so centring either leaves the cards sitting low. Centring
 * the row keeps the cards level in the viewport while the row travels. Where
 * that pin would tuck the heading under the fixed nav, the intro fades out on
 * the approach instead of the row being pushed down to keep it.
 *
 * The offset lands in a custom property so the CSS `translate` longhand
 * composes with the appear animation's `transform` instead of replacing it.
 */
const MIN_WIDTH = 810;
const NAV_GAP = 8;
const INTRO_FADE = 180;

type Pin = {
  wrapper: HTMLElement;
  section: HTMLElement;
  travel: number;
  pinTop: number;
  rowTop: number;
  rowBottom: number;
  intro: HTMLElement | null;
  headingTop: number;
  fadeIntro: boolean;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function translateX(element: HTMLElement): number {
  const transform = getComputedStyle(element).transform;
  if (!transform.startsWith("matrix")) return 0;
  const parts = transform.slice(transform.indexOf("(") + 1, -1).split(",");
  return Number.parseFloat(parts[4] ?? "0") || 0;
}

function navBottom(): number {
  const nav = document.querySelector<HTMLElement>(
    'nav[aria-label="Navigasi utama"]',
  );
  return nav ? nav.getBoundingClientRect().bottom : 64;
}

function measurePins(): Pin[] {
  const pins: Pin[] = [];

  for (const wrapper of document.querySelectorAll<HTMLElement>(
    "[data-pw-why-runway]",
  )) {
    const section = wrapper.querySelector<HTMLElement>("[data-pw-drift]");
    if (!section) continue;

    const row = Array.from(
      section.querySelectorAll<HTMLElement>(".pw-why-row"),
    ).find((element) => element.getBoundingClientRect().width > 0);
    const stage = row?.closest<HTMLElement>(".framer-1mgirvw-container");
    const intro = section.querySelector<HTMLElement>(".framer-1n1ykuh");
    const heading = section.querySelector<HTMLElement>("h2");

    const sectionRect = section.getBoundingClientRect();
    const rowRect = row?.getBoundingClientRect();

    let travel = 0;
    if (row && stage) {
      // The row travels until its last card meets the section's clip edge, not
      // the 1080px text column: the cards deliberately bleed past the column.
      // Peel the intro tween's transform off the stage so this reads the row's
      // real resting position.
      const stageLeft = stage.getBoundingClientRect().left - translateX(stage);
      const visible = sectionRect.right - stageLeft;
      travel = Math.max(0, row.scrollWidth - visible);
    }

    const rowTop = rowRect ? rowRect.top - sectionRect.top : 0;
    const rowBottom = rowRect
      ? rowRect.bottom - sectionRect.top
      : sectionRect.height;
    const introBottom = intro
      ? intro.getBoundingClientRect().bottom - sectionRect.top
      : 0;

    pins.push({
      wrapper,
      section,
      travel,
      pinTop: 0,
      rowTop,
      rowBottom,
      intro,
      headingTop: heading
        ? heading.getBoundingClientRect().top - sectionRect.top
        : introBottom,
      fadeIntro: false,
    });
  }

  return pins;
}

function reset(wrappers: HTMLElement[]) {
  for (const wrapper of wrappers) {
    wrapper.style.removeProperty("height");
    delete wrapper.dataset.pwPinned;

    const section = wrapper.querySelector<HTMLElement>("[data-pw-drift]");
    section?.style.removeProperty("--pw-drift");
    section?.style.removeProperty("--pw-why-top");
    section
      ?.querySelector<HTMLElement>(".framer-1n1ykuh")
      ?.style.removeProperty("opacity");
  }
}

export default function WhyScrollDrift() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wrappers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-pw-why-runway]"),
    );
    if (!wrappers.length) return;

    let raf = 0;
    let pins: Pin[] = [];

    const paint = () => {
      raf = 0;
      for (const pin of pins) {
        const top = pin.wrapper.getBoundingClientRect().top;
        const progress =
          pin.travel > 0 ? clamp01((pin.pinTop - top) / pin.travel) : 0;
        const x = -pin.travel * progress;
        pin.section.style.setProperty("--pw-drift", `${x.toFixed(2)}px`);

        // When the pinned row sits high enough that the intro would be caught
        // under the fixed nav, fade it out over the approach so no half-cut
        // heading is left frozen on screen.
        if (pin.intro) {
          if (!pin.fadeIntro) {
            pin.intro.style.removeProperty("opacity");
          } else {
            const opacity = clamp01((top - pin.pinTop) / INTRO_FADE);
            pin.intro.style.opacity = opacity >= 1 ? "" : opacity.toFixed(3);
          }
        }
      }
    };

    const reflow = () => {
      raf = 0;

      if (window.innerWidth < MIN_WIDTH) {
        reset(wrappers);
        pins = [];
        return;
      }

      const vh = window.innerHeight;
      const nav = navBottom() + NAV_GAP;
      pins = measurePins().filter((pin) => pin.travel > 0);

      for (const pin of pins) {
        const height = pin.section.offsetHeight;
        // Centre the card row in the viewport so the cards read level while
        // the row travels. Lifting the section to clear the heading is what
        // makes the cards sit low, so the row wins.
        const centre = (pin.rowTop + pin.rowBottom) / 2;
        pin.pinTop = Math.round(vh / 2 - centre);
        // If that pin would catch the intro's heading under the fixed nav, fade
        // the intro out over the approach so no half-cut heading is left
        // frozen on screen. When the heading clears the nav, it stays.
        pin.fadeIntro = pin.intro !== null && pin.headingTop + pin.pinTop < nav;
        pin.wrapper.style.height = `${height + pin.travel}px`;
        pin.wrapper.dataset.pwPinned = "true";
        pin.section.style.setProperty("--pw-why-top", `${pin.pinTop}px`);
      }

      paint();
    };

    const scheduleReflow = () => {
      if (!raf) raf = requestAnimationFrame(reflow);
    };

    const schedulePaint = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    reflow();
    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", scheduleReflow);
    window.addEventListener("load", scheduleReflow);

    // Fonts and late-loading media change the section height after hydration;
    // re-measure so the runway and pin offset stay in sync.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleReflow);
    for (const pin of pins) {
      observer?.observe(pin.section);
      const row = pin.section.querySelector<HTMLElement>(".pw-why-row");
      if (row) observer?.observe(row);
    }
    document.fonts?.ready.then(scheduleReflow).catch(() => {});

    return () => {
      window.removeEventListener("scroll", schedulePaint);
      window.removeEventListener("resize", scheduleReflow);
      window.removeEventListener("load", scheduleReflow);
      observer?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      reset(wrappers);
    };
  }, []);

  return null;
}
