"use client";

import { SCENARIOS, type Scenario } from "@/components/companion/scenarios";

/**
 * Scenario cards — the three-up suggestion grid from the reference chat UI.
 *
 * Geometry is taken from the reference, value for value:
 *
 *   grid    one column, three from `sm`, 10px gap
 *   card    min-height 129px, radius 15px, padding 14px, 1px border
 *   icon    16px inside a 24px slot, top-left
 *   title   12px semibold, body 10.5px / 1.38 under it
 *
 * The reference shows three cards and Lumina has exactly three demo cases
 * (plan §11.5), so the grid fills one row and the empty state stays balanced.
 */
export function ScenarioCards({
  onPick,
  disabled = false,
}: {
  onPick: (scenario: Scenario) => void;
  disabled?: boolean;
}) {
  return (
    <ul
      aria-label="Contoh kasus"
      className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3"
    >
      {SCENARIOS.map((scenario) => {
        const Icon = scenario.icon;
        return (
          <li key={scenario.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(scenario)}
              title={scenario.hint}
              className="group flex h-full min-h-[129px] w-full flex-col justify-between rounded-[15px] border border-edge-soft bg-panel p-3.5 text-left shadow-rest transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-brand-edge-soft hover:bg-brand-tint hover:shadow-lift focus-visible:outline-2 focus-visible:outline-brand-glow focus-visible:outline-offset-2 disabled:opacity-50"
            >
              <span className="grid size-6 place-items-center text-ink-mute group-hover:text-brand-chip-ink">
                <Icon aria-hidden strokeWidth={1.6} className="size-4" />
              </span>

              <span className="mt-2.5 block">
                <span className="block text-[12px] font-semibold text-txt">
                  {scenario.label}
                </span>
                <span className="mt-1 block text-[10.5px] text-ink-faint leading-[1.38]">
                  {scenario.hint}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
