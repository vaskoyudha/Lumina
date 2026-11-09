"use client";

import * as React from "react";

type PulseKind = "ping" | "opacity";
type Beat = () => void;

const PULSE_DURATION_MS = 420;
const PULSE_PERIOD_MS = 4_800;

/*
 * A finite pulse, not a permanent animation. Many status dots can be live at
 * once; one shared timer keeps them in phase and the compositor idle between
 * beats, the same trade Hermes makes for its status bar.
 */
const beats = new Set<Beat>();
let timer: number | null = null;

function tick() {
  if (document.visibilityState === "hidden") return;
  for (const beat of beats) beat();
}

function subscribe(beat: Beat): () => void {
  beats.add(beat);
  if (beats.size === 1) {
    beat();
    timer = window.setInterval(tick, PULSE_PERIOD_MS);
  }
  return () => {
    beats.delete(beat);
    if (beats.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

export function StatusPulse({
  kind = "ping",
  ...props
}: React.ComponentProps<"span"> & { kind?: PulseKind }) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof element.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let animation: Animation | null = null;
    const play = () => {
      animation?.cancel();
      animation = element.animate(
        kind === "ping"
          ? [
              { opacity: 1, transform: "scale(1)" },
              { opacity: 0, transform: "scale(2)" },
            ]
          : [{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }],
        {
          duration: PULSE_DURATION_MS,
          easing:
            kind === "ping" ? "cubic-bezier(0, 0, 0.2, 1)" : "ease-in-out",
        },
      );
    };

    const unsubscribe = subscribe(play);
    return () => {
      unsubscribe();
      animation?.cancel();
    };
  }, [kind]);

  return <span {...props} ref={ref} />;
}
