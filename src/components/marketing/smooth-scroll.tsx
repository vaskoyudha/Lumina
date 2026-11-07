"use client";

import { useEffect } from "react";

/*
 * The reference site ships Lenis: a 1200px wheel step lands over ~1s of eased
 * travel instead of jumping. Measured sample (150ms apart) from the live site:
 * 661 → 1002 → 1127 → 1167 → 1188 → 1195 → 1199. This is that curve, reduced
 * to the wheel path only — keyboard, scrollbar, touch, and programmatic
 * scrolling keep the browser's native behaviour.
 */
const LERP = 0.1;
const FRAME = 1000 / 60;
const HIDDEN = "(prefers-reduced-motion: reduce)";

function maxScroll() {
  return document.documentElement.scrollHeight - window.innerHeight;
}

/*
 * Nested scroll areas (the quick drawer, any future list) must keep their own
 * wheel behaviour; easing the page underneath them would be a trap.
 */
function insideScroller(target: EventTarget | null) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia(HIDDEN).matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let current = window.scrollY;
    let target = current;
    let raf = 0;
    let running = false;
    let lastY = Math.round(current);
    let lastTime = 0;

    const tick = (now: number) => {
      const dt = lastTime ? Math.min(now - lastTime, 64) : FRAME;
      lastTime = now;
      const alpha = 1 - (1 - LERP) ** (dt / FRAME);
      current += (target - current) * alpha;
      if (Math.abs(target - current) < 0.4) current = target;
      lastY = Math.round(current);
      window.scrollTo({ top: lastY, behavior: "instant" });
      if (current === target) {
        running = false;
        lastTime = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (event: WheelEvent) => {
      // Browser zoom and horizontal gestures stay native.
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (insideScroller(event.target)) return;
      event.preventDefault();
      if (!running) {
        current = window.scrollY;
        target = current;
      }
      const step =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      target = Math.max(0, Math.min(maxScroll(), target + event.deltaY * step));
      if (!running) {
        running = true;
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    /*
     * Any scroll the loop did not write (keyboard, scrollbar drag, anchor
     * scroll) wins: stop easing and re-anchor on the real position.
     */
    const onScroll = () => {
      if (!running) return;
      if (Math.abs(window.scrollY - lastY) <= 2) return;
      cancelAnimationFrame(raf);
      running = false;
      lastTime = 0;
      target = window.scrollY;
      current = target;
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      running = false;
      lastTime = 0;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });

    return () => {
      stop();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", stop);
    };
  }, []);

  return null;
}
