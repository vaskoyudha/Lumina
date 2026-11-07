"use client";

import { animate } from "motion";
import { useEffect } from "react";

type Track = { transition?: Record<string, unknown>; [k: string]: unknown };

export default function AppearAnimations({
  config,
}: {
  config: Record<string, any>;
}) {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const roots = Array.from(
      document.querySelectorAll<HTMLElement>("[data-framer-appear-id]"),
    );
    const observers: IntersectionObserver[] = [];

    for (const el of roots) {
      const id = el.getAttribute("data-framer-appear-id");
      if (!id) continue;

      /*
       * Inner routes ship empty appear configs, and responsive variants repeat
       * the same appear id on sibling elements. Falling back to the standard
       * Framer end state and animating every element (not one per id) keeps
       * content visible instead of stranded at `opacity: 0.001`.
       */
      const spec = config[id];
      const target = spec?.default ?? spec;
      const initial: Track = target?.initial ?? { opacity: 0.001 };
      const to: Track = target?.animate ?? { opacity: 1 };
      const transition = (to.transition ?? {}) as Record<string, unknown>;
      const delay = typeof transition.delay === "number" ? transition.delay : 0;
      const duration =
        typeof transition.duration === "number" ? transition.duration : 0.4;
      const easing = transition.ease as
        | [number, number, number, number]
        | undefined;
      const isTween = transition.type === "tween";

      const props: string[] = [];
      if (initial.opacity !== to.opacity && to.opacity !== undefined)
        props.push("opacity");
      if ((initial.y ?? 0) !== (to.y ?? 0)) props.push("y");
      if ((initial.x ?? 0) !== (to.x ?? 0)) props.push("x");
      if ((initial.scale ?? 1) !== (to.scale ?? 1)) props.push("scale");
      if ((initial.rotate ?? 0) !== (to.rotate ?? 0)) props.push("rotate");
      if (!props.length && to.opacity === undefined) continue;

      const finalValues: Record<string, number> = {};
      for (const p of props) finalValues[p] = to[p] as number;
      if (!props.length) finalValues.opacity = 1;

      const options = isTween
        ? { duration, delay, ease: easing ?? ([0.44, 0, 0.56, 1] as const) }
        : { type: "spring" as const, bounce: 0, duration, delay };

      if (reduce) {
        for (const p of Object.keys(finalValues)) {
          (el.style as unknown as Record<string, string>)[p] = String(
            finalValues[p],
          );
        }
        continue;
      }

      const run = () => {
        animate(el, finalValues, options);
      };

      if (el.getBoundingClientRect().top < window.innerHeight) {
        run();
        continue;
      }

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              run();
              io.disconnect();
            }
          }
        },
        { rootMargin: "0px 0px -10% 0px" },
      );
      io.observe(el);
      observers.push(io);
    }

    return () => {
      for (const io of observers) io.disconnect();
    };
  }, [config]);

  return null;
}
