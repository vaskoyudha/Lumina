"use client";

import * as React from "react";
import { ActivityOrb } from "@/components/companion/activity-orb";
import { cn } from "@/lib/utils";

/**
 * Text-clipped 105° gradient swept by the `thinking-shimmer` keyframes.
 * Pair with a solid colour for the reduced-motion fallback already baked in.
 */
export const SHIMMER_TEXT_CLASS =
  "bg-[linear-gradient(105deg,var(--lumina-dim)_0%,var(--lumina-dim)_39%,var(--lumina-panel)_48%,var(--lumina-panel)_52%,var(--lumina-dim)_61%,var(--lumina-dim)_100%)] bg-[length:300%_100%] bg-clip-text text-transparent motion-safe:animate-[thinking-shimmer_2.2s_linear_infinite] motion-reduce:bg-none motion-reduce:text-dim";

/**
 * Streaming indicator, extracted from the reference's `LiveReasoningStatus.vue`.
 *
 * Taken from the source: the 15px/600 label, the 105° gradient with stops at
 * 0/39/48/52/61/100%, `background-size: 300% 100%`, and the
 * `thinking-shimmer` sweep at 100% → 0% over 2.2s, linear, infinite. The
 * elapsed time sits beside it in tabular figures with a reserved width, so the
 * number changing does not reflow the row.
 *
 * One divergence: the shimmer runs in ink, not an accent colour. On a surface
 * where colour only ever means risk, a coloured shimmer reads as a warning
 * rather than as work in progress. The small activity orb to its left carries
 * the motion cue without turning the label into a warning.
 *
 * This is the only genuinely in-flight state in the product, and it is honest
 * about being a wait: the counter starts when the call leaves and counts real
 * elapsed time, not a designed delay.
 */
export function ThinkingRow({
  label,
  startedAt,
}: {
  label: string;
  /** Milliseconds since epoch, or null when nothing is running. */
  startedAt: number | null;
}) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (startedAt === null) {
      setElapsed(0);
      return;
    }
    // First measurement immediately, so a fast reply never shows "0.0 detik".
    setElapsed(Date.now() - startedAt);
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  if (startedAt === null) return null;

  return (
    <output className="flex h-10 motion-safe:animate-[trace-enter_180ms_ease-out] items-center gap-2.5">
      <ActivityOrb className="size-[15px]" />
      <span
        className={cn(
          SHIMMER_TEXT_CLASS,
          "font-semibold text-[15px] leading-5",
        )}
      >
        {label}
      </span>
      <span className="tabular min-w-[3.5rem] text-[11px] text-dim">
        {(elapsed / 1000).toFixed(1)} detik
      </span>
    </output>
  );
}
