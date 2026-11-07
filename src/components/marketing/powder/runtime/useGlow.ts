"use client";

import { useEffect, useRef } from "react";

const RADIUS = 450;
const TAU = 0.33;
const PEAK = 0.82;
const GRADIENT = `rgba(255,255,255,0.25), rgba(0,0,0,0)`;

type Options = {
  radius?: number;
  peak?: number;
  tau?: number;
  gradient?: string;
};

type LayerState = {
  host: HTMLElement;
  layers: HTMLElement[];
  radius: number;
  peak: number;
  tau: number;
  gradient: string;
  rect: DOMRect | null;
  inside: boolean;
  opacity: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
};

const registry = new Set<LayerState>();
let raf = 0;
let last = 0;
let listening = false;
let dirty = true;

function refreshRects() {
  for (const state of registry) state.rect = state.host.getBoundingClientRect();
  dirty = false;
}

function paint(state: LayerState) {
  const opacity = state.opacity;
  const x = state.x.toFixed(2);
  const y = state.y.toFixed(2);
  for (const layer of state.layers) {
    layer.style.opacity = opacity.toFixed(4);
    if (opacity > 0.0015) {
      layer.style.background = `radial-gradient(${state.radius}px at ${x}px ${y}px, ${state.gradient})`;
    }
  }
}

function frame(now: number) {
  const dt = Math.min(Math.max(now - last, 0) / 1000, 0.064);
  last = now;
  let active = false;
  for (const state of registry) {
    const k = 1 - Math.exp(-dt / state.tau);
    const goal = state.inside ? state.peak : 0;
    state.opacity += (goal - state.opacity) * k;
    state.x += (state.targetX - state.x) * k;
    state.y += (state.targetY - state.y) * k;
    paint(state);
    if (
      Math.abs(goal - state.opacity) > 0.0015 ||
      Math.abs(state.targetX - state.x) > 0.05 ||
      Math.abs(state.targetY - state.y) > 0.05
    ) {
      active = true;
    }
  }
  raf = active ? requestAnimationFrame(frame) : 0;
}

function kick() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType !== "mouse") return;
  if (dirty) refreshRects();
  let touched = false;
  let hovered = false;
  for (const state of registry) {
    const rect = state.rect;
    const inside =
      !!rect &&
      rect.width > 0 &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (inside) {
      state.targetX = event.clientX - rect.left;
      state.targetY = event.clientY - rect.top;
      if (!state.inside) {
        state.x = state.targetX;
        state.y = state.targetY;
      }
      hovered = true;
    }
    if (inside !== state.inside) touched = true;
    state.inside = inside;
  }
  if (hovered) dirty = true;
  if (touched) kick();
}

function invalidate() {
  dirty = true;
}

function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("scroll", invalidate, {
    passive: true,
    capture: true,
  });
  window.addEventListener("resize", invalidate, { passive: true });
}

export function registerGlow(
  host: HTMLElement,
  layers: HTMLElement[],
  options: Options = {},
) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none)").matches
  )
    return () => {};
  if (!layers.length) return () => {};

  for (const layer of layers) {
    layer.style.willChange = "opacity, background";
    layer.dataset.glowManaged = "1";
  }

  const state: LayerState = {
    host,
    layers,
    radius: options.radius ?? RADIUS,
    peak: options.peak ?? PEAK,
    tau: options.tau ?? TAU,
    gradient: options.gradient ?? GRADIENT,
    rect: host.getBoundingClientRect(),
    inside: false,
    opacity: 0,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  };
  registry.add(state);
  listen();

  return () => {
    registry.delete(state);
    for (const layer of layers) delete layer.dataset.glowManaged;
    if (!registry.size && listening) {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", invalidate, { capture: true });
      window.removeEventListener("resize", invalidate);
      listening = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

export function useGlow<T extends HTMLElement>(options: Options = {}) {
  const ref = useRef<T | null>(null);
  const settings = useRef(options);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const layers = Array.from(
      host.querySelectorAll<HTMLElement>("[data-glow]"),
    );
    return registerGlow(host, layers, settings.current);
  }, []);

  return ref;
}
