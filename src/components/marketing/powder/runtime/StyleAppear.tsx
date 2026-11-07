"use client";

import { animate, MotionValue } from "motion";
import { useEffect } from "react";
import specs from "@/data/powder/style-appear.json";

type Spec = {
  type: "spring";
  bounce: number;
  delay: number;
  duration: number;
  threshold: number;
  x: number;
  y: number;
  scale: number;
};

const SPECS = specs as Record<string, Spec>;

const RX_BASE = /^translate\(\s*-50%\s*,\s*-50%\s*\)/;

function baseTransform(style: string) {
  const m = RX_BASE.exec(style.trim());
  return m ? m[0] : "";
}

function specFor(el: HTMLElement): Spec | undefined {
  const tokens = el.className.split(/\s+/);
  for (const t of tokens) {
    const s = SPECS[t];
    if (s) return s;
  }
  return undefined;
}

const RX_Y = /translateY\(\s*(-?[\d.]+)px\s*\)/;
const RX_SCALE = /scale\(\s*([\d.]+)\s*\)/;

/*
 * Inner routes (blog, pricing, legal pages) ship appear targets whose specs
 * were not captured in `style-appear.json`. Without a spec they keep their
 * serialized `opacity: 0` forever, which blanks whole pages. Derive a spec
 * from the element's own serialized transform so those pages reveal with the
 * same spring used elsewhere.
 */
function fallbackSpec(el: HTMLElement): Spec {
  const transform = el.style.transform;
  const y = RX_Y.exec(transform);
  const scale = RX_SCALE.exec(transform);
  return {
    type: "spring",
    bounce: 0,
    delay: 0,
    duration: 0.8,
    threshold: 0.05,
    x: 0,
    y: y ? Number(y[1]) : 24,
    scale: scale ? Number(scale[1]) : 1,
  };
}

function inViewRatio(entry: IntersectionObserverEntry) {
  const rect = entry.boundingClientRect;
  if (rect.height === 0) return 0;
  return (
    entry.intersectionRect.height / Math.min(rect.height, window.innerHeight)
  );
}

export default function StyleAppear() {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const processed: HTMLElement[] = [];
    const observers: IntersectionObserver[] = [];
    const pending = new Map<
      HTMLElement,
      { io: IntersectionObserver; run: () => void }
    >();
    const cleanups: Array<() => void> = [];
    let sweep = 0;

    const nodes = document.querySelectorAll<HTMLElement>(
      ".framer-site [style]",
    );

    for (const el of nodes) {
      if (el.dataset.framerAppearId) continue;
      if (el.style.willChange !== "transform") continue;
      const inlineOpacity = parseFloat(el.style.opacity || "1");
      const spec =
        specFor(el) ?? (inlineOpacity < 1 ? fallbackSpec(el) : undefined);
      if (!spec) continue;

      const opacityTarget = 1;
      const startOpacity = Number.isFinite(inlineOpacity)
        ? Math.min(inlineOpacity, opacityTarget)
        : opacityTarget;

      const base = baseTransform(el.style.transform);

      /*
       * Reduced motion means no reveal choreography: clear the serialized
       * hidden state outright so no target can be left waiting for a scroll.
       */
      if (reduce) {
        el.style.transform =
          `${base} translateX(0px) translateY(0px) scale(1)`.trim();
        el.style.opacity = String(opacityTarget);
        continue;
      }

      const opacity = new MotionValue<number>(startOpacity);
      const x = new MotionValue<number>(spec.x);
      const y = new MotionValue<number>(spec.y);
      const scale = new MotionValue<number>(spec.scale);

      const write = () => {
        const t = `${base} translateX(${x.get()}px) translateY(${y.get()}px) scale(${scale.get()})`;
        el.style.transform = t.trim();
        el.style.opacity = String(opacity.get());
      };

      write();

      const run = () => {
        const spring = {
          type: "spring" as const,
          bounce: spec.bounce,
          duration: spec.duration,
          delay: spec.delay,
        };
        const subs = [opacity, x, y, scale].map((v) => v.on("change", write));
        cleanups.push(() =>
          subs.forEach((u) => {
            u();
          }),
        );
        animate(opacity, opacityTarget, spring);
        animate(x, 0, spring);
        animate(y, 0, spring);
        animate(scale, 1, spring);
      };

      processed.push(el);

      if (el.getBoundingClientRect().top < window.innerHeight) {
        run();
        continue;
      }

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (inViewRatio(entry) < spec.threshold) continue;
            io.disconnect();
            pending.delete(el);
            run();
          }
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
      );
      pending.set(el, { io, run });
      io.observe(el);
      observers.push(io);
    }

    /*
     * A fast scrollbar drag or instant jump can carry a target from below the
     * viewport to above it without ever intersecting: IntersectionObserver
     * only reports changes, so those nodes would keep the serialized hidden
     * state forever. Release anything left above the viewport after a scroll.
     */
    const releasePassed = () => {
      for (const [el, { io, run }] of pending) {
        if (el.getBoundingClientRect().bottom <= 0) {
          io.disconnect();
          pending.delete(el);
          run();
        }
      }
    };

    const onScroll = () => {
      if (sweep) return;
      sweep = requestAnimationFrame(() => {
        sweep = 0;
        releasePassed();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(sweep);
      window.removeEventListener("scroll", onScroll);
      observers.forEach((io) => {
        io.disconnect();
      });
      cleanups.forEach((fn) => {
        fn();
      });
    };
  }, []);

  return null;
}
