"use client";

import * as React from "react";
import { SCENARIOS, type Scenario } from "@/components/companion/scenarios";
import { cn } from "@/lib/utils";

/**
 * Scenario cards — the horizontal card track the reference chat UI uses to
 * start a conversation, rebuilt on this project's contract.
 *
 * Structure copied from the reference: a scroll-snapping track of cards, one
 * card active at a time, arrow keys move the selection, the active card is the
 * only one in the tab order. That last detail matters — a row of eight
 * tab stops is a keyboard maze, so the track behaves as a single control.
 *
 * What was deliberately not copied: the reference's cards are foil-stamped
 * gradient art with embers and a glare sweep. `lumina-ui` refuses decorative
 * gradients and glows, and on a page where colour means risk a shimmering card
 * would read as a warning. These are flat, bordered, and quiet.
 */

export function ScenarioCards({
  onPick,
  activeId,
  disabled = false,
}: {
  onPick: (scenario: Scenario) => void;
  activeId?: string | null;
  disabled?: boolean;
}) {
  const trackRef = React.useRef<HTMLUListElement>(null);
  const [active, setActive] = React.useState(0);

  const move = (next: number) => {
    const clamped = Math.max(0, Math.min(SCENARIOS.length - 1, next));
    setActive(clamped);
    const node = trackRef.current?.children[clamped] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest", inline: "center" });
    node?.querySelector("button")?.focus();
  };

  return (
    <div>
      <ul
        ref={trackRef}
        aria-label="Contoh kasus"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(active + 1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(active - 1);
          }
        }}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
      >
        {SCENARIOS.map((scenario, index) => {
          const Icon = scenario.icon;
          const isActive = activeId === scenario.id;
          return (
            <li key={scenario.id} className="snap-start">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(scenario)}
                onFocus={() => setActive(index)}
                tabIndex={index === active ? 0 : -1}
                aria-pressed={isActive}
                className={cn(
                  "flex h-full w-[9.5rem] flex-col items-start gap-2 rounded-md border p-3 text-left transition-[border-color,background-color] duration-150 ease-out disabled:opacity-60",
                  isActive
                    ? "border-txt bg-panel"
                    : "border-line bg-panel hover:border-dim hover:bg-panel-2",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-sm",
                    isActive ? "bg-txt text-bg" : "bg-panel-2 text-dim",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="font-medium text-sm text-txt leading-tight">
                  {scenario.label}
                </span>
                <span className="text-[0.7rem] text-dim leading-snug">
                  {scenario.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
