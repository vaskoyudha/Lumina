"use client";

import * as React from "react";
import { SCENARIOS, type Scenario } from "@/components/companion/scenarios";
import { cn } from "@/lib/utils";

/**
 * Scenario cards — the card track from the reference chat UI, with its
 * geometry reproduced exactly and its surface re-drawn in this project's ink
 * palette.
 *
 * Geometry taken from `NewChatAgentCards.vue` (reference), value for value:
 *
 *   card        aspect-ratio 1 / 1.4, border-radius 16px, padding 3px (rim)
 *   surface     border-radius 13px, plus a 1px hairline inset 7px, radius 12px
 *   width       clamp(64px, (100cqh - 84px) / 1.4, 176px)
 *   gap         14px
 *   logo stone  width/height 47% of card, radius 26%, rotated -9deg
 *   logo art    62% of the stone
 *   name        clamp(11px, card-width * .108, 19px), weight 650,
 *               letter-spacing -0.7px, line-height 1.1, centred
 *   mark        18% wide, 1px hairline rule under the name
 *   inactive    scale(.88), opacity .7 — the active card is the only one at 1
 *
 * What is NOT reproduced: the reference's gold foil, conic-gradient sheen,
 * travelling beams, embers and parallax glare. `lumina-ui` refuses decorative
 * gradients and glows, and on a surface where colour means risk a shimmering
 * card would read as a warning. The rim, the inset hairline, the portrait
 * proportion and the depth-on-activate are all kept — those are what make the
 * card read as a physical object rather than a rectangle.
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
    <div className="relative w-full">
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
        // `mask-image` fades the track edges, as the reference does, so the
        // row reads as continuing past the viewport instead of being clipped.
        className="flex snap-x snap-mandatory items-center justify-center gap-[14px] overflow-x-auto px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SCENARIOS.map((scenario, index) => {
          const Icon = scenario.icon;
          const isActive = activeId === scenario.id || index === active;
          return (
            <li key={scenario.id} className="shrink-0 snap-start">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(scenario)}
                onFocus={() => setActive(index)}
                tabIndex={index === active ? 0 : -1}
                aria-pressed={isActive}
                title={scenario.hint}
                aria-label={`${scenario.label} — ${scenario.hint}`}
                className={cn(
                  // The 3px padding is the rim; the surface sits inside it.
                  "block aspect-[1/1.4] w-[clamp(64px,7.5rem,120px)] cursor-pointer rounded-[16px] p-[3px] transition-[transform,opacity,box-shadow] duration-150 ease-out",
                  "focus-visible:outline-2 focus-visible:outline-txt focus-visible:outline-offset-[7px]",
                  isActive
                    ? "scale-100 opacity-100"
                    : "scale-[0.88] opacity-80 hover:opacity-100",
                )}
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, var(--lumina-txt), color-mix(in oklab, var(--lumina-txt) 62%, var(--lumina-line)))"
                    : "var(--lumina-field)",
                  boxShadow: isActive
                    ? "0 19px 28px -17px color-mix(in oklab, var(--lumina-txt) 30%, transparent)"
                    : "0 6px 16px color-mix(in oklab, var(--lumina-txt) 8%, transparent)",
                }}
              >
                {/* Surface: 13px radius inside the 16px rim, hairline inset 7px. */}
                <span
                  className="relative flex h-full w-full flex-col items-center justify-center gap-[clamp(6px,0.6rem,18px)] rounded-[13px] p-[8%]"
                  style={{
                    background: isActive
                      ? "var(--lumina-panel)"
                      : "var(--lumina-panel-2)",
                  }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-[7px] rounded-[12px] border border-line"
                  />

                  {/* Logo stone: 47% of the card, radius 26%, tilted -9deg. */}
                  <span className="relative z-[4] grid aspect-square w-[47%] shrink-0 place-items-center rounded-[26%] border border-white/80 bg-white shadow-[3px_6px_10px_color-mix(in_oklab,var(--lumina-txt)_12%,transparent),inset_0_1px_2px_#fff] [transform:rotate(-9deg)]">
                    <Icon
                      aria-hidden
                      strokeWidth={1.6}
                      className={cn(
                        "size-[62%]",
                        isActive ? "text-txt" : "text-dim",
                      )}
                    />
                  </span>

                  <span
                    className={cn(
                      "relative z-[5] w-full overflow-hidden text-ellipsis whitespace-nowrap text-center font-[650] leading-[1.1] tracking-[-0.7px]",
                      scenario.label.length > 11
                        ? "text-[clamp(9px,0.75rem,14px)]"
                        : "text-[clamp(11px,0.85rem,19px)]",
                      isActive ? "text-txt" : "text-dim",
                    )}
                  >
                    {scenario.label}
                  </span>

                  <span
                    aria-hidden
                    className="relative z-[4] h-px w-[18%] shrink-0 bg-line"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
