"use client";

import { animate } from "motion";
import { useEffect } from "react";

/*
 * The reference reveals every section once as it enters the viewport, with a
 * short stagger between siblings. `data-reveal` mirrors Framer's appear ids for
 * the sections that were hand-built rather than extracted (about, programs,
 * triage, transformation, pricing, faq, contact). The Powder sections keep
 * their own extracted runtimes.
 *
 * The hidden state is applied here, not in CSS: if this module never runs, the
 * page stays readable instead of blank. Only elements below the fold are
 * hidden, so the first paint never flashes.
 */
const EASE = [0.4, 0, 0.2, 1] as const;
const DURATION = 0.7;
const STAGGER = 0.08;
const STAGGER_MAX = 0.32;

type RevealControl = { stop: () => void };

export default function SectionReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const controls: RevealControl[] = [];
    const prepared = new WeakSet<HTMLElement>();
    const playing = new WeakSet<HTMLElement>();
    const awaiting = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    let sweep = 0;

    const play = (el: HTMLElement, delay: number) => {
      if (playing.has(el)) return;
      playing.add(el);
      el.style.willChange = "transform, opacity";
      const control = animate(
        el,
        { opacity: 1, y: 0 },
        {
          duration: DURATION,
          delay,
          ease: EASE,
          onComplete: () => {
            el.style.willChange = "";
          },
        },
      );
      controls.push(control);
    };

    /*
     * Elements already on screen (anchor loads, reloads) stay visible. Anything
     * below the fold is hidden first so its entry can play when it is reached.
     */
    const prepare = (el: HTMLElement) => {
      if (prepared.has(el)) return;
      prepared.add(el);
      const rect = el.getBoundingClientRect();
      if (
        rect.bottom <= 0 ||
        (rect.top < window.innerHeight * 0.92 && rect.bottom > 0)
      ) {
        playing.add(el);
        return;
      }
      el.style.opacity = "0.001";
      el.style.transform = "translateY(24px)";
      awaiting.add(el);
      observer?.observe(el);
    };

    /*
     * A fast scrollbar drag or instant anchor jump can move a target from below
     * the viewport to above it without ever intersecting: IntersectionObserver
     * only reports changes, so those nodes would keep the hidden state forever.
     * Sweep the waiting set after each scroll and finish anything left behind.
     */
    const revealPassed = () => {
      for (const el of awaiting) {
        if (el.getBoundingClientRect().bottom <= 0) {
          awaiting.delete(el);
          observer?.unobserve(el);
          play(el, 0);
        }
      }
    };

    const onScroll = () => {
      if (sweep) return;
      sweep = requestAnimationFrame(() => {
        sweep = 0;
        revealPassed();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const prepareAll = (root: ParentNode) => {
      for (const el of root.querySelectorAll<HTMLElement>("[data-reveal]")) {
        prepare(el);
      }
      if (root instanceof HTMLElement && root.matches("[data-reveal]")) {
        prepare(root);
      }
    };

    /*
     * One frame after mount: hydration has finished, so writing inline styles
     * here cannot trip React's attribute checks.
     */
    const frame = requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            // Anchor jumps can skip past a target without ever intersecting it.
            // Once it is above the viewport, show it rather than stranding it.
            if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
              observer?.unobserve(entry.target);
              awaiting.delete(entry.target as HTMLElement);
              play(entry.target as HTMLElement, 0);
            }
          }
          const entering = entries
            .filter((entry) => entry.isIntersecting)
            .sort(
              (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
            );
          entering.forEach((entry, index) => {
            observer?.unobserve(entry.target);
            awaiting.delete(entry.target as HTMLElement);
            play(
              entry.target as HTMLElement,
              Math.min(index * STAGGER, STAGGER_MAX),
            );
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
      );

      prepareAll(document);
    });

    /*
     * HMR, route re-renders, and tab switches can replace nodes after the first
     * scan. New `data-reveal` nodes get the same treatment instead of being
     * stranded at the hidden state.
     */
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) prepareAll(node);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(sweep);
      window.removeEventListener("scroll", onScroll);
      mutations.disconnect();
      observer?.disconnect();
      for (const control of controls) control.stop();
    };
  }, []);

  return null;
}
