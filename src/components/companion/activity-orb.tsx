"use client";

import { cn } from "@/lib/utils";

/**
 * The in-flight mark that sits to the left of working text.
 *
 * Two counter-rotating rings and a breathing core: readable at 16px, and
 * frozen into a still ring under `prefers-reduced-motion`. It is decorative —
 * the adjacent label already says what is happening.
 */
export function ActivityOrb({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-5 shrink-0 items-center justify-center text-brand-strong",
        className,
      )}
    >
      <span className="absolute inset-[1px] rounded-full border-[1.5px] border-current opacity-20" />
      <span className="absolute inset-0 motion-safe:animate-[activity-orb-spin_1.35s_linear_infinite]">
        <span className="absolute inset-[1px] rounded-full border-[1.5px] border-transparent border-t-current border-r-current" />
      </span>
      <span className="absolute inset-[5px] motion-safe:animate-[activity-orb-spin-reverse_0.9s_linear_infinite]">
        <span className="absolute inset-0 rounded-full border-[1.5px] border-transparent border-b-current border-l-current opacity-70" />
      </span>
      <span className="absolute inset-0 m-auto size-1 rounded-full bg-current motion-safe:animate-[activity-orb-pulse_1.4s_ease-in-out_infinite]" />
    </span>
  );
}
