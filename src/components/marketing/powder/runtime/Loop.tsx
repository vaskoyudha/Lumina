"use client";

import { animate } from "motion";
import { useEffect } from "react";

const SELECTOR = ".framer-10cfw4u, .framer-1jtwmb7, .framer-tucf3";
const DURATION = 1;
const EASE: [number, number, number, number] = [0, 0, 1, 1];

export default function Loop() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(SELECTOR),
    );
    if (!targets.length) return;

    const controls = targets.map((el) =>
      animate(
        el,
        { opacity: [1, 0] },
        {
          duration: DURATION,
          ease: EASE,
          repeat: Infinity,
          repeatType: "mirror",
          repeatDelay: 0,
        },
      ),
    );

    return () => {
      controls.forEach((c) => {
        c.stop();
      });
      targets.forEach((el) => {
        el.style.opacity = "1";
      });
    };
  }, []);

  return null;
}
