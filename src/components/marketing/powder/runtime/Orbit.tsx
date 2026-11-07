"use client";

import { useEffect } from "react";

const RATE = 6;

export default function Orbit() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const a = document.querySelectorAll<HTMLElement>(".framer-1gd8fdf");
    const b = document.querySelectorAll<HTMLElement>(".framer-127w3yb");
    if (!a.length && !b.length) return;

    let raf = 0;
    let angle = 0;
    let prev = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(now - prev, 64);
      prev = now;
      angle += (RATE * dt) / 1000;
      const x = (angle % 360).toFixed(3);
      a.forEach((el) => {
        el.style.transform = `rotate(-${x}deg)`;
      });
      b.forEach((el) => {
        el.style.transform = `rotate(${x}deg)`;
      });
      raf = requestAnimationFrame(frame);
    };

    a.forEach((el) => {
      el.style.transformOrigin = "center";
    });
    b.forEach((el) => {
      el.style.transformOrigin = "center";
    });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      a.forEach((el) => {
        el.style.transform = "none";
      });
      b.forEach((el) => {
        el.style.transform = "none";
      });
    };
  }, []);

  return null;
}
