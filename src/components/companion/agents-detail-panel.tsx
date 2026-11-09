"use client";

import { ShieldCheck } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import {
  AGENT_DISPLAY_NAME,
  AGENT_PURPOSE,
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  type DetectorAgent,
} from "@/components/companion/agents";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

/**
 * Agents detail — the right-hand pane while the Agents view is open.
 *
 * It replaces "Panel bukti" only on that view: the evidence panel reports a
 * run, and this pane explains the detectors before any run exists. Each
 * agent gets one sentence of purpose; the center diagram carries the mechanism
 * chips, so neither surface repeats the other.
 *
 * Selection is a highlight, not a filter. All briefs stay visible, which
 * keeps the pane readable at a glance and avoids hiding four agents behind an
 * interaction. Clicking a diagram row scrolls the matching brief into view.
 */

export function AgentsDetailPanel({
  selected = null,
  className,
  action,
  titleId = "panel-detail-title",
}: {
  selected?: DetectorAgent | null;
  className?: string;
  action?: ReactNode;
  /** Unique per surface: the chat renders this pane in a column and a sheet. */
  titleId?: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selected) return;
    const target = listRef.current?.querySelector<HTMLElement>(
      `[data-detail="${selected}"]`,
    );
    // Global scroll-behavior CSS cannot override the JS scroll options, so
    // honour the OS preference here as well.
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // jsdom has no layout; optional call keeps the behaviour testable.
    target?.scrollIntoView?.({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [selected]);

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-none bg-transparent py-0 ring-0",
        className,
      )}
    >
      <CardHeader className="shrink-0 border-edge border-b bg-panel/85 px-3.5 pt-3 pb-2.5 backdrop-blur-md [.border-b]:pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-brand shadow-orb"
            />
            <div className="min-w-0">
              <CardTitle>
                <h2
                  className="font-semibold text-[12.5px] text-txt"
                  id={titleId}
                >
                  Detail agen
                </h2>
              </CardTitle>
              <p className="mt-0.5 truncate text-[10.5px] text-dim">
                {AGENT_SEQUENCE.length} pemeriksa di bawah satu orkestrator
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="rounded-full border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[9px] text-brand-ink uppercase tracking-[0.06em]">
              {AGENT_SEQUENCE.length} agen
            </span>
            {action}
          </div>
        </div>
      </CardHeader>

      <div
        className="min-h-0 flex-1 overflow-y-auto bg-panel-2/60 px-3 py-3"
        ref={listRef}
      >
        <ul className="flex list-none flex-col gap-2">
          {AGENT_SEQUENCE.map((agent, index) => {
            const Icon = AGENT_REGISTRY[agent].icon;
            const display = AGENT_DISPLAY_NAME[agent];
            const { label } = STAGE_LABEL[agent];
            const active = selected === agent;

            return (
              <li
                data-detail={agent}
                data-active={active ? "true" : undefined}
                aria-current={active ? "true" : undefined}
                key={agent}
                className={cn(
                  "group/detail relative overflow-hidden rounded-[12px] bg-panel px-3 py-3 transition-[box-shadow,transform] duration-200",
                  active
                    ? "shadow-lift ring-1 ring-brand/45"
                    : "shadow-rest ring-1 ring-transparent hover:-translate-y-px hover:shadow-lift hover:ring-brand/20",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 left-0 w-[3px] transition-colors duration-200",
                    active ? "bg-brand" : "bg-transparent",
                  )}
                />
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-px grid size-8 shrink-0 place-items-center rounded-[9px] transition-colors duration-200",
                      active
                        ? "bg-brand text-panel shadow-orb"
                        : "bg-brand-soft text-brand-ink",
                    )}
                  >
                    <Icon aria-hidden strokeWidth={1.8} className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="font-semibold text-[12.5px] text-ink leading-snug">
                          {display}
                        </p>
                        <span className="font-mono text-[8.5px] text-ink-faint uppercase tracking-[0.08em]">
                          {label}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[11px] leading-none tabular-nums transition-colors duration-200",
                          active ? "text-brand" : "text-ink-faint/70",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-soft leading-relaxed">
                      {AGENT_PURPOSE[agent]}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 flex items-start gap-1.5 rounded-[10px] border border-edge bg-panel px-2.5 py-2 text-[10.5px] text-dim leading-snug">
          <ShieldCheck
            aria-hidden
            className="mt-px size-3 shrink-0 text-brand"
          />
          Agen berjalan lokal dan hanya melaporkan temuan; skor tetap dihitung
          satu engine.
        </p>
      </div>
    </Card>
  );
}
