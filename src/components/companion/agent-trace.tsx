"use client";

import { Check, ChevronRight, Circle, MinusCircle, Search } from "lucide-react";
import * as React from "react";
import type { AgentStage, AgentTrace } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

/**
 * The trace card — what the agents actually did, in the order they did it.
 *
 * Shell extracted from `ToolRunSummary.vue`: the outer element is only
 * `width: 520px / max-width: 100% / min-width: 0`; the border, background and
 * radius belong to the *header pill* (min-height 32px, 12px/8px padding, 1px
 * `--lumina-line`, full radius to match the chat's own pill header, 11px text,
 * 7px gap). The expanded body sits below the pill without a shared border,
 * which is why the section has none either.
 * The chevron is 11px and rotates 90° over 150ms; the icon is 13px.
 *
 * The body reveals with `grid-template-rows: 0fr → 1fr` over 220ms on
 * `cubic-bezier(0.22, 1, 0.36, 1)`, plus the source's `translateY(-4px)` and a
 * 150ms opacity fade.
 *
 * Step glyphs come from `TaskPlanCard.vue`: ✓ done, ◉ running, ○ pending, in a
 * 16px slot. Lucide icons replace the source's text glyphs so weight and
 * alignment are consistent with the rest of the product.
 *
 * Two deliberate divergences, both recorded in the design spec:
 *
 * a. The source paints its icon and hover state with `--brand-primary`. In
 *    this palette colour only ever means risk, so a hover tint would read as a
 *    verdict on a neutral control. Ink instead.
 * b. Each stage prints its measured milliseconds. The detectors genuinely
 *    finish in fractions of a millisecond; animating them as if in flight is
 *    the defect this component exists to remove.
 */

const MS = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function Glyph({ status }: { status: AgentStage["status"] }) {
  if (status === "temuan" || status === "selesai") {
    return (
      <Check aria-hidden strokeWidth={2.2} className="size-3.5 text-brand" />
    );
  }
  if (status === "dilewati") {
    return (
      <MinusCircle
        aria-hidden
        strokeWidth={1.8}
        className="size-3.5 text-dim"
      />
    );
  }
  if (status === "gagal") {
    return (
      <MinusCircle
        aria-hidden
        strokeWidth={1.8}
        className="size-3.5 text-danger"
      />
    );
  }
  return (
    <Circle aria-hidden strokeWidth={1.8} className="size-3.5 text-txt/45" />
  );
}

export function AgentTraceCard({
  trace,
  defaultOpen = false,
  className,
}: {
  trace: AgentTrace;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const running = trace.stages.some((stage) => stage.status === "berjalan");
  const findings = trace.stages.reduce((sum, stage) => sum + stage.findings, 0);

  return (
    <section className={cn("w-full max-w-[520px] min-w-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Sembunyikan tahapan" : "Lihat tahapan"}
        className="flex min-h-[32px] w-full min-w-0 items-center gap-[7px] rounded-full border border-line bg-panel px-3 py-1 text-left text-[11px] text-dim transition-colors duration-150 hover:bg-txt/6 focus-visible:border-txt/25 focus-visible:outline-none"
      >
        <ChevronRight
          aria-hidden
          strokeWidth={2}
          className={cn(
            "size-[11px] shrink-0 transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-90",
          )}
        />
        <Search
          aria-hidden
          strokeWidth={1.5}
          className="size-[13px] shrink-0 text-txt/70"
        />
        <span className="shrink-0 font-medium text-txt/75">
          {trace.stages.length} pemeriksaan
        </span>
        <span className="min-w-0 truncate">
          {findings > 0 ? `${findings} temuan` : "tidak ada temuan"}
        </span>
        {running ? (
          <span aria-hidden className="ms-auto shrink-0 tracking-[0.15em]">
            •••
          </span>
        ) : (
          <Check
            aria-hidden
            strokeWidth={2.2}
            className="ms-auto size-3.5 shrink-0 text-brand"
          />
        )}
        <span className="tabular shrink-0 text-txt/55">
          {MS.format(trace.totalMs)} ms
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-4px)",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="mt-1.5 flex flex-col gap-1 rounded-[10px] border border-line bg-panel px-2 py-1.5">
            {trace.stages.map((stage) => (
              <li
                key={stage.id}
                aria-busy={stage.status === "berjalan" ? true : undefined}
                className="flex items-start gap-2 rounded-[7px] py-1"
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  <Glyph status={stage.status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-txt text-xs leading-tight">
                    {stage.label}
                  </span>
                  <span className="block text-[11px] text-dim leading-snug">
                    {stage.note ?? stage.task}
                  </span>
                </span>
                <span className="tabular shrink-0 pt-0.5 text-[10px] text-txt/45">
                  {stage.status === "berjalan"
                    ? "…"
                    : `${MS.format(stage.ms)} ms`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
