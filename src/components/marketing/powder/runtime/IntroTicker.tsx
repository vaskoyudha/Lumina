"use client";

import { animate, MotionValue } from "motion";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import appearSpecs from "@/data/powder/style-appear.json";

const GAP = 10;
const SPEED = 25;

type AppearSpec = {
  bounce: number;
  delay: number;
  duration: number;
  threshold: number;
  x: number;
  y: number;
  scale: number;
};
const APPEAR = appearSpecs as Record<string, AppearSpec>;
const RX_BASE = /^translate\(\s*-50%\s*,\s*-50%\s*\)/;

const UL_STYLE: CSSProperties = {
  display: "flex",
  position: "relative",
  listStyleType: "none",
  padding: "0",
  margin: "0",
  justifyContent: "flex-start",
  flexDirection: "row",
  gap: "10px",
  opacity: "0",
  alignItems: "center",
  width: "100%",
  height: "100%",
  maxHeight: "100%",
  maxWidth: "100%",
  transform: "translateX(-10px)",
};

type ItemBounds = { start: number; end: number };

type Metrics = {
  items: ItemBounds[];
  listSize: number;
  period: number;
  cloneGroups: number;
};

function measure(ul: HTMLUListElement, wrap: HTMLElement) {
  const items = [
    ...ul.querySelectorAll<HTMLLIElement>("li.ticker-item"),
  ].filter((el) => el.offsetWidth > 0);
  if (items.length === 0) return null;
  const bounds = items.map((el) => ({
    start: el.offsetLeft,
    end: el.offsetLeft + el.offsetWidth,
  }));
  const total = bounds[bounds.length - 1].end - bounds[0].start;
  if (total <= 0) return null;
  const visibleLength = Math.min(wrap.offsetWidth, window.innerWidth);
  const widest = Math.max(...items.map((el) => el.offsetWidth));
  let groups = 0;
  let filled = 0;
  while (filled < visibleLength && groups < 50) {
    filled = (total + GAP) * (groups + 1) - widest;
    groups += 1;
  }
  const cloneGroups = Math.max(groups - 1, 0);
  const metrics: Metrics = {
    items: bounds,
    listSize: (total + GAP) * (cloneGroups + 1),
    period: total + GAP,
    cloneGroups,
  };
  return { metrics, items };
}

function specFor(el: HTMLElement): AppearSpec | undefined {
  for (const token of el.className.split(/\s+/)) {
    const spec = APPEAR[token];
    if (spec) return spec;
  }
  return undefined;
}

function revealIn(root: HTMLElement, delaySec: number) {
  const cleanups: Array<() => void> = [];
  const nodes = root.querySelectorAll<HTMLElement>("[style]");
  for (const el of nodes) {
    if (el.dataset.framerAppearId) continue;
    if (el.style.willChange !== "transform") continue;
    const spec = specFor(el);
    if (!spec) continue;
    const base = RX_BASE.exec(el.style.transform.trim())?.[0] ?? "";
    const startOpacity = Math.min(parseFloat(el.style.opacity || "1") || 1, 1);
    const opacity = new MotionValue(startOpacity);
    const x = new MotionValue(spec.x);
    const y = new MotionValue(spec.y);
    const scale = new MotionValue(spec.scale);
    const write = () => {
      const t = `${base} translateX(${x.get()}px) translateY(${y.get()}px) scale(${scale.get()})`;
      el.style.transform = t.trim();
      el.style.opacity = String(opacity.get());
    };
    write();
    const subs = [opacity, x, y, scale].map((v) => v.on("change", write));
    cleanups.push(() =>
      subs.forEach((u) => {
        u();
      }),
    );
    const opts = {
      type: "spring" as const,
      bounce: spec.bounce,
      duration: spec.duration,
      delay: delaySec + spec.delay,
    };
    animate(opacity, 1, opts);
    animate(x, 0, opts);
    animate(y, 0, opts);
    animate(scale, 1, opts);
  }
  return () =>
    cleanups.forEach((fn) => {
      fn();
    });
}

function buildClones(
  ul: HTMLUListElement,
  items: HTMLLIElement[],
  groups: number,
) {
  for (let group = 0; group < groups; group += 1) {
    for (const item of items) {
      const node = item.cloneNode(true) as HTMLLIElement;
      node.className = "clone-item";
      node.setAttribute("aria-hidden", "true");
      node.removeAttribute("aria-posinset");
      node.removeAttribute("aria-setsize");
      node.style.transform = "none";
      ul.appendChild(node);
    }
  }
}

export default function IntroTicker({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ulRef = useRef<HTMLUListElement>(null);
  const metricsRef = useRef<Metrics | null>(null);
  const itemsRef = useRef<HTMLLIElement[]>([]);
  const offsetRef = useRef(-10);
  const lastRef = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const ul = ulRef.current;
    if (!wrap || !ul) return;

    const apply = (offset: number) => {
      ul.style.transform = `translateX(${offset}px)`;
      const metrics = metricsRef.current;
      if (!metrics) return;
      for (let i = 0; i < itemsRef.current.length; i += 1) {
        const el = itemsRef.current[i];
        const bounds = metrics.items[i];
        const shift = offset + bounds.end <= 0 ? metrics.listSize : 0;
        el.style.transform = shift === 0 ? "none" : `translateX(${shift}px)`;
      }
    };

    let raf = 0;
    let running = false;
    let revealed = false;
    let disposers: Array<() => void> = [];

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const metrics = metricsRef.current;
      const delta = Math.min(now - lastRef.current, 64);
      lastRef.current = now;
      if (!metrics) return;
      offsetRef.current -= (SPEED * delta) / 1000;
      if (offsetRef.current <= -metrics.period) {
        offsetRef.current += metrics.period;
      }
      apply(offsetRef.current);
    };

    const sync = () => {
      const result = measure(ul, wrap);
      if (!result) return;
      disposers.forEach((fn) => {
        fn();
      });
      disposers = [];
      ul.querySelectorAll("li.clone-item").forEach((node) => {
        node.remove();
      });
      metricsRef.current = result.metrics;
      itemsRef.current = result.items;
      buildClones(ul, result.items, result.metrics.cloneGroups);
      ul.style.opacity = "1";
      ul.style.willChange = "transform";
      if (revealed) {
        for (const node of ul.querySelectorAll<HTMLElement>("li.clone-item")) {
          disposers.push(revealIn(node, 0));
        }
      }
      apply(offsetRef.current);
    };

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      for (const node of ul.querySelectorAll<HTMLElement>("li.clone-item")) {
        disposers.push(revealIn(node, 0));
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        sync();
        reveal();
        if (running) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          return;
        running = true;
        lastRef.current = performance.now();
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: "100px" },
    );
    observer.observe(wrap);

    const resize = new ResizeObserver(() => {
      if (!metricsRef.current) return;
      sync();
    });
    resize.observe(wrap);

    return () => {
      observer.disconnect();
      resize.disconnect();
      if (raf) cancelAnimationFrame(raf);
      disposers.forEach((fn) => {
        fn();
      });
      disposers = [];
      ul.querySelectorAll("li.clone-item").forEach((node) => {
        node.remove();
      });
      ul.style.opacity = "0";
      ul.style.willChange = "";
      ul.style.transform = "translateX(-10px)";
      itemsRef.current.forEach((el) => {
        el.style.transform = "none";
      });
      metricsRef.current = null;
      itemsRef.current = [];
    };
  }, []);

  return (
    <div
      className="framer-iqdsmo"
      ref={wrapRef}
      style={{ overflowX: "clip", display: "flex", position: "relative" }}
    >
      <ul ref={ulRef} style={UL_STYLE}>
        {children}
      </ul>
    </div>
  );
}
