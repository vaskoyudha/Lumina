"use client";

import {
  Fingerprint,
  Link2,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import {
  AGENT_DISPLAY_NAME,
  AGENT_PURPOSE,
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
 * run, and this pane explains the five detectors before any run exists. Each
 * agent gets one sentence of purpose; the center diagram carries the mechanism
 * chips, so neither surface repeats the other.
 *
 * Selection is a highlight, not a filter. All five briefs stay visible, which
 * keeps the pane readable at a glance and avoids hiding four agents behind an
 * interaction. Clicking a diagram row scrolls the matching brief into view.
 */

const AGENT_ICON: Record<DetectorAgent, LucideIcon> = {
  message: MessageSquare,
  link: Link2,
  identity: Fingerprint,
  conversation: MessagesSquare,
  evidence: Quote,
};

export function AgentsDetailPanel({
  selected = null,
  className,
  action,
}: {
  selected?: DetectorAgent | null;
  className?: string;
  action?: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selected) return;
    const target = listRef.current?.querySelector<HTMLElement>(
      `[data-detail="${selected}"]`,
    );
    // jsdom has no layout; optional call keeps the behaviour testable.
    target?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <Card
      aria-labelledby="panel-detail-title"
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-none bg-transparent py-0 ring-0",
        className,
      )}
    >
      <CardHeader className="shrink-0 border-edge border-b bg-panel/85 px-3.5 pt-3 pb-2.5 backdrop-blur-md [.border-b]:pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>
              <h2
                className="font-semibold text-[12px] text-txt"
                id="panel-detail-title"
              >
                Detail agen
              </h2>
            </CardTitle>
            <p className="mt-0.5 truncate text-[10.5px] text-dim">
              Lima pemeriksa di bawah satu orkestrator
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="rounded-[5px] border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
              {AGENT_SEQUENCE.length} agen
            </span>
            {action}
          </div>
        </div>
      </CardHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3" ref={listRef}>
        <ul className="flex list-none flex-col gap-2">
          {AGENT_SEQUENCE.map((agent, index) => {
            const Icon = AGENT_ICON[agent];
            const display = AGENT_DISPLAY_NAME[agent];
            const { label } = STAGE_LABEL[agent];
            const active = selected === agent;

            return (
              <li
                data-detail={agent}
                data-active={active ? "true" : undefined}
                key={agent}
                className={cn(
                  "rounded-[10px] border px-3 py-2.5 transition-[border-color,background-color] duration-200",
                  active
                    ? "border-brand-line bg-brand-soft/40"
                    : "border-edge bg-panel",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-px grid size-7 shrink-0 place-items-center rounded-[7px] transition-colors duration-200",
                      active
                        ? "bg-brand text-white"
                        : "bg-brand-soft text-brand-ink",
                    )}
                  >
                    <Icon aria-hidden strokeWidth={1.8} className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="font-semibold text-[12px] text-ink leading-snug">
                        {display}
                      </p>
                      <span className="font-mono text-[9px] text-ink-faint uppercase tracking-[0.08em]">
                        {label}
                      </span>
                      <span className="font-mono text-[9px] text-ink-faint">
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

        <p className="mt-3 flex items-start gap-1.5 rounded-[10px] bg-txt/5 px-2.5 py-1.5 text-[10.5px] text-dim leading-snug">
          <ShieldCheck aria-hidden className="mt-px size-3 shrink-0" />
          Agen berjalan lokal dan hanya melaporkan temuan; skor tetap dihitung
          satu engine.
        </p>
      </div>
    </Card>
  );
}
