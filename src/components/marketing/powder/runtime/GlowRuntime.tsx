"use client";

import { useEffect } from "react";
import { registerGlow } from "./useGlow";

const WHITE = "rgba(255,255,255,0.25), rgba(0,0,0,0)";
const STRONG = "rgba(255,255,255,0.65), rgba(0,0,0,0)";
const WARM = "rgb(255,243,240), rgba(0,0,0,0)";

const STRONG_HOSTS = [
  "framer-z8bszj-container",
  "framer-175zk6-container",
  "framer-bmzixe-container",
];
const WARM_HOSTS = ["framer-69d297-container", "framer-f26fz1-container"];
const HALO_HOST = "framer-arwdi5-container";
const CARD_HOST = "framer-13yk504-container";

function optionsFor(container: Element | null) {
  const cls = container ? String(container.className) : "";
  if (cls.includes(HALO_HOST)) return { radius: 195, gradient: STRONG };
  if (STRONG_HOSTS.some((key) => cls.includes(key)))
    return { radius: 735, gradient: STRONG };
  if (WARM_HOSTS.some((key) => cls.includes(key)))
    return { radius: 735, gradient: WARM };
  if (cls.includes(CARD_HOST)) return { radius: 450, gradient: WHITE };
  return { radius: 735, gradient: WHITE };
}

function closestContainer(layer: HTMLElement) {
  let el: HTMLElement | null = layer.parentElement;
  for (let i = 0; i < 4 && el; i += 1) {
    if (typeof el.className === "string" && el.className.includes("-container"))
      return el;
    el = el.parentElement;
  }
  return layer.parentElement;
}

function setup(root: ParentNode) {
  const disposers: Array<() => void> = [];
  const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-glow]"));
  for (const layer of layers) {
    if (layer.dataset.glowManaged === "1") continue;
    disposers.push(
      registerGlow(layer, [layer], optionsFor(closestContainer(layer))),
    );
  }
  return disposers;
}

export default function GlowRuntime() {
  useEffect(() => {
    const disposers = setup(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.addedNodes.length) {
          setup(document);
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      for (const dispose of disposers) dispose();
    };
  }, []);
  return null;
}
