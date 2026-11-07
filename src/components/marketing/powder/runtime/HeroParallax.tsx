"use client";

import { useEffect } from "react";

/*
 * Ratios measured on the published site: each hero layer translates down at a
 * fixed fraction of scrollY, so it trails the page instead of moving with it.
 * The value lands in a custom property so the CSS `translate` longhand composes
 * with the appear animation's `transform` instead of overwriting it.
 */
const FACTORS: ReadonlyArray<readonly [selector: string, factor: number]> = [
  [".framer-x2ps8j .framer-u991jm", 0.31],
  [".framer-x2ps8j .framer-f7ktf5", 0.17],
  [".framer-x2ps8j .framer-dqdt72", 0.2],
];

export default function HeroParallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = FACTORS.flatMap(([selector, factor]) => {
      const el = document.querySelector<HTMLElement>(selector);
      return el ? [{ el, factor }] : [];
    });
    if (!layers.length) return;

    let raf = 0;

    const paint = () => {
      raf = 0;
      const y = window.scrollY;
      for (const { el, factor } of layers) {
        el.style.setProperty("--pw-parallax", `${(y * factor).toFixed(2)}px`);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      for (const { el } of layers) el.style.removeProperty("--pw-parallax");
    };
  }, []);

  return null;
}
