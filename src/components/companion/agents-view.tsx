"use client";

import {
  ArrowRight,
  Check,
  Download,
  Link2,
  Maximize2,
  Minus,
  Plus,
  Sparkle,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  Fragment,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LuminaLogo } from "@/components/brand/lumina-logo";
import {
  AGENT_DISPLAY_NAME,
  AGENT_MECHANISM,
  AGENT_REGISTRY,
  CREW_SEQUENCE,
  type DetectorAgent,
  LUMINA_STEPS,
} from "@/components/companion/agents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import type { AgentRunSummary } from "@/lib/orchestrator/summary";
import { cn } from "@/lib/utils";

/**
 * Agents — the detector overview shown in the center column.
 *
 * The diagram is static: it answers who checks a message and what each one
 * looks for, and its connectors are decorative — they loop to show direction,
 * never to claim that a stage is running. The one live surface is the optional
 * latest-run summary above it, a content-free `AgentRunSummary` for the
 * signed-in account; no message and no trace is read here.
 *
 * Shape: Lumina sits at the top as the orchestrator and lays the detectors out
 * in a responsive grid, each dropping into its own mechanism lane. Reading
 * order is top-to-bottom between the tiers and left-to-right within the grid —
 * no horizontal chains between detectors, because none of them waits for
 * another.
 */

/**
 * One agent's face: the supplied portrait when it exists, otherwise the
 * registry icon. Reading both from the registry keeps art and icons in one
 * place as the crew grows.
 */
function AgentFace({ agent, size }: { agent: DetectorAgent; size: number }) {
  const profile = AGENT_REGISTRY[agent];
  if (profile.portrait) {
    return (
      <Image
        src={profile.portrait}
        alt=""
        width={size}
        height={size}
        className="size-full object-cover"
      />
    );
  }
  const Icon = profile.icon;
  return <Icon aria-hidden className="size-1/2 text-brand-ink" />;
}

export function AgentsView({
  onSelect,
  selected = null,
  onExport,
  onCopyLink,
  copied = false,
  latestRun = null,
}: {
  onSelect: (agent: DetectorAgent) => void;
  selected?: DetectorAgent | null;
  onExport: () => void;
  onCopyLink: () => void;
  copied?: boolean;
  latestRun?: AgentRunSummary | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:overflow-visible">
      <header className="shrink-0 pb-4 sm:pb-5">
        <div className="w-full">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-brand-glow to-brand-strong text-panel shadow-[0_10px_22px_-12px_color-mix(in_oklab,var(--lumina-brand)_80%,transparent)]">
                <Sparkle
                  aria-hidden
                  fill="currentColor"
                  strokeWidth={0}
                  className="size-[22px]"
                />
              </span>
              <div className="min-w-0">
                <h1
                  id="agen-pemeriksa-title"
                  className="font-bold text-[24px] text-txt leading-none tracking-[-0.035em] sm:text-[28px]"
                >
                  Agen pemeriksa
                </h1>
                <p className="mt-1.5 font-medium text-dim text-xs sm:text-[13px]">
                  Bagan, satu skor deterministik.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={copied ? "Tautan disalin" : "Salin tautan"}
                onClick={onCopyLink}
                className="size-10 shrink-0 rounded-full border border-line bg-panel text-ink-soft shadow-sm transition-colors hover:bg-panel-2 hover:text-txt"
              >
                {copied ? (
                  <Check aria-hidden strokeWidth={1.8} className="size-4" />
                ) : (
                  <Link2 aria-hidden strokeWidth={1.7} className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="h-10 gap-1.5 rounded-full border border-line bg-panel px-4 text-xs font-medium text-txt shadow-sm transition-colors hover:bg-panel-2"
              >
                <Download aria-hidden strokeWidth={1.7} className="size-3.5" />
                Ekspor percakapan
              </Button>
              <Button
                asChild
                size="sm"
                className="h-10 rounded-full bg-brand px-4 text-xs font-semibold text-panel shadow-[0_10px_22px_-14px_color-mix(in_oklab,var(--lumina-brand)_85%,transparent)] hover:bg-brand-strong"
              >
                <Link href="/komunitas">
                  <Users aria-hidden strokeWidth={1.9} className="size-3.5" />
                  Komunitas
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {latestRun ? (
        <section
          aria-label="Pemeriksaan terakhir"
          className="mb-4 rounded-[14px] border border-line bg-panel px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[12px] text-txt">
              Pemeriksaan terakhir
            </p>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[9.5px] text-brand-ink">
              {latestRun.modus}
            </span>
            <span className="text-[10px] text-dim">
              {latestRun.band} ·{" "}
              {latestRun.totalMs >= 1000
                ? `${(latestRun.totalMs / 1000).toFixed(1).replace(".", ",")} s`
                : `${latestRun.totalMs} ms`}
            </span>
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {latestRun.agents.map((agent) => {
              const display =
                AGENT_DISPLAY_NAME[agent.id as keyof typeof AGENT_DISPLAY_NAME];
              return (
                <li
                  key={`${agent.id}-${agent.ms}`}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[10px]"
                >
                  <span className="font-medium text-txt">
                    {display ?? agent.label}
                  </span>
                  <span className="text-dim">{agent.status}</span>
                  <span className="tabular text-[9px] text-dim">
                    {agent.ms} ms
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="min-h-0 flex-1">
        {/*
         * The diagram lives on its own pannable canvas — drag to move, wheel or
         * the controls to zoom. The field is present at every width so the
         * figure keeps its identity; below `lg` the canvas chrome disappears and
         * the diagram renders in normal document flow, so the wrapped grid stays
         * readable and page scrolling is never trapped.
         */}
        <DiagramCanvas>
          <LuminaCard />

          <FlowFanOut />

          {/*
           * Each column is one channel: the detector and the mechanisms it
           * checks live in the same tall card, so the agents read as parallel
           * lanes rather than disconnected boxes. Below `lg` the lanes stack and
           * a solid drop joins each card to the next; on desktop a shared bus
           * joins row one to row two, and the fan-in closes the tree into the
           * score. Every mark is solid: a wiring map, not a live flow.
           */}
          <ul className="mt-1 grid list-none grid-cols-1 gap-x-4 sm:grid-cols-2 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {CREW_SEQUENCE.map((agent, index) => (
              <Fragment key={agent}>
                <li className="flex min-w-0 flex-col">
                  <AgentLane
                    agent={agent}
                    index={index}
                    onSelect={onSelect}
                    selected={selected === agent}
                  />
                  <div className="flex justify-center lg:hidden">
                    {index < CREW_SEQUENCE.length - 1 ? (
                      <Rail className="h-9" />
                    ) : null}
                  </div>
                </li>
                {index === 3 ? (
                  <li aria-hidden className="hidden lg:col-span-4 lg:block">
                    <RowLink />
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ul>

          <FlowFanIn />
          <ScoreNode />
        </DiagramCanvas>
      </div>
    </div>
  );
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

/**
 * The pannable diagram surface.
 *
 * Modelled on the 9Router topology canvas: a white sheet with a faint technical
 * grid, a slim "Alur Pekerjaan" header carrying the + / − / fit controls, and a
 * lift under the result. Below `lg` the controls disappear and the diagram
 * renders in normal document flow, so the wrapped grid stays readable and page
 * scrolling is never trapped. Nothing here reads live state.
 */
function DiagramCanvas({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const didPan = useRef(false);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [fitScale, setFitScale] = useState(1);
  const [dragging, setDragging] = useState(false);

  const clamp = useCallback((x: number, y: number, scale: number) => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return { x, y };
    const slackX =
      Math.max(0, (content.offsetWidth * scale - canvas.clientWidth) / 2) + 120;
    const slackY =
      Math.max(0, (content.offsetHeight * scale - canvas.clientHeight) / 2) +
      120;
    return {
      x: Math.max(-slackX, Math.min(slackX, x)),
      y: Math.max(-slackY, Math.min(slackY, y)),
    };
  }, []);

  const zoomBy = (factor: number) => {
    setView((current) => {
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, current.scale * factor),
      );
      const next = clamp(current.x, current.y, scale);
      return { x: next.x, y: next.y, scale };
    });
  };

  const reset = () => setView({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (!media.matches) {
        drag.current = null;
        setDragging(false);
        setView({ x: 0, y: 0, scale: 1 });
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return;

    const measure = () => {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        setFitScale(1);
        return;
      }
      const margin = 24;
      const byWidth = (canvas.clientWidth - margin) / content.offsetWidth;
      const byHeight = (canvas.clientHeight - margin) / content.offsetHeight;
      setFitScale(Math.max(MIN_SCALE, Math.min(1, byWidth, byHeight)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 0.925;
      setView((current) => {
        const scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, current.scale * factor),
        );
        const next = clamp(current.x, current.y, scale);
        return { x: next.x, y: next.y, scale };
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [clamp]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      const active = drag.current;
      if (!active) return;
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      if (!active.moved && Math.hypot(dx, dy) > 4) {
        active.moved = true;
        didPan.current = true;
      }
      const next = clamp(active.originX + dx, active.originY + dy, view.scale);
      setView((current) => ({ ...current, x: next.x, y: next.y }));
    };
    const onEnd = () => {
      drag.current = null;
      setDragging(false);
      if (didPan.current) {
        window.setTimeout(() => {
          didPan.current = false;
        }, 0);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [dragging, clamp, view.scale]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if ((event.target as HTMLElement).closest("[data-no-pan]")) return;
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    };
    setDragging(true);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!didPan.current) return;
    didPan.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const contentStyle: CSSProperties = {
    transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale * fitScale})`,
    transformOrigin: "center",
  };

  return (
    <section
      aria-label="Kanvas diagram alur agen"
      className={cn(
        "relative flex h-auto flex-col overflow-hidden rounded-[18px] bg-panel ring-1 ring-edge shadow-[0_1px_2px_color-mix(in_oklab,var(--lumina-txt)_6%,transparent),0_8px_20px_-10px_color-mix(in_oklab,var(--lumina-txt)_18%,transparent)] lg:h-full",
        dragging && "lg:select-none",
      )}
    >
      <div
        data-no-pan
        className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-edge border-b px-4 py-2.5"
      >
        <div className="relative flex min-w-0 items-center gap-2.5 self-stretch pr-4">
          <span className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-brand text-panel shadow-orb">
            <Workflow aria-hidden strokeWidth={1.9} className="size-3.5" />
          </span>
          <span className="truncate font-semibold text-[13px] text-txt tracking-tight">
            Alur Pekerjaan
          </span>
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-[11px] h-[2px] rounded-full bg-brand"
          />
        </div>

        <div className="hidden overflow-hidden rounded-[11px] border border-edge bg-panel/95 shadow-rest backdrop-blur-md lg:flex lg:items-stretch">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Perbesar diagram"
            onClick={() => zoomBy(1.15)}
            className="rounded-none text-ink-mute hover:bg-brand-soft hover:text-brand-ink"
          >
            <Plus aria-hidden strokeWidth={2} className="size-3.5" />
          </Button>
          <span aria-hidden className="w-px bg-edge" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Perkecil diagram"
            onClick={() => zoomBy(1 / 1.15)}
            className="rounded-none text-ink-mute hover:bg-brand-soft hover:text-brand-ink"
          >
            <Minus aria-hidden strokeWidth={2} className="size-3.5" />
          </Button>
          <span aria-hidden className="w-px bg-edge" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Pusatkan diagram"
            onClick={reset}
            className="rounded-none text-ink-mute hover:bg-brand-soft hover:text-brand-ink"
          >
            <Maximize2 aria-hidden strokeWidth={1.9} className="size-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={canvasRef}
        onClickCapture={onClickCapture}
        onPointerDown={onPointerDown}
        className={cn(
          "cortex-dots relative min-h-0 flex-1 overflow-hidden p-4 sm:p-5 lg:p-0 lg:touch-none",
          dragging ? "lg:cursor-grabbing" : "lg:cursor-grab",
        )}
      >
        <div className="relative flex h-full lg:items-center lg:justify-center">
          <div
            ref={contentRef}
            className={cn(
              "mx-auto w-full max-w-[820px] lg:px-8 lg:pt-12 lg:pb-8",
              !dragging &&
                !reduced &&
                "lg:transition-transform lg:duration-200 lg:ease-out",
            )}
            style={contentStyle}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The orchestrator core: the warm command deck that drives the row below.
 *
 * The supplied mascots are shown as an overlapping crew stack on the right,
 * so the card reads as "one engine, every agent" rather than a generic banner.
 * The three steps reuse the chip grammar from the detectors but sit on a
 * darkened inset so they stay legible on orange.
 */
function LuminaCard() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-5 rounded-[30px] bg-brand/20 blur-2xl"
      />
      <Card
        data-agent="lumina"
        className="relative gap-0 overflow-hidden rounded-[20px] border-0 bg-brand-strong py-0 ring-1 ring-panel/20"
        style={{
          boxShadow:
            "0 24px 52px -24px color-mix(in oklab, var(--lumina-brand) 58%, transparent), inset 0 1px 0 color-mix(in oklab, var(--lumina-panel) 44%, transparent)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 54% 140% at 4% -24%, color-mix(in oklab, var(--lumina-brand-glow) 88%, transparent) 0%, transparent 58%), radial-gradient(ellipse 52% 94% at 100% 132%, color-mix(in oklab, var(--lumina-brand-strong) 92%, transparent) 0%, transparent 64%), linear-gradient(112deg, var(--lumina-brand) 0%, var(--lumina-brand-strong) 88%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--lumina-panel) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        <CardHeader className="relative flex flex-row items-center gap-3 px-4 pt-3 pb-0">
          <span className="relative grid size-12 shrink-0 place-items-center rounded-[14px] bg-panel shadow-lift ring-1 ring-panel/70">
            <LuminaLogo variant="mark" className="size-9" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <CardTitle className="font-semibold text-[18px] text-panel leading-tight tracking-[-0.02em]">
                Lumina
              </CardTitle>
              <Badge
                variant="outline"
                className="h-auto rounded-full border-panel/30 bg-panel/15 px-1.5 py-0.5 font-mono text-[8px] font-normal text-panel uppercase tracking-[0.1em]"
              >
                Orkestrator
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-panel/85 leading-snug">
              Satu engine deterministik yang menjalankan seluruh agen.
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-1 pr-1 sm:flex">
            <div className="flex -space-x-2">
              {CREW_SEQUENCE.map((agent) => (
                <span
                  key={agent}
                  className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-panel ring-2 ring-brand-strong"
                >
                  <AgentFace agent={agent} size={24} />
                </span>
              ))}
            </div>
            <span className="font-mono text-[7px] text-panel/70 uppercase tracking-[0.16em] leading-none">
              {String(CREW_SEQUENCE.length).padStart(2, "0")} agen
            </span>
          </div>
        </CardHeader>
        <CardContent className="relative mt-2.5 border-panel/25 border-t px-4 py-2">
          <ol className="flex list-none flex-wrap items-center gap-x-1 gap-y-1">
            {LUMINA_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-1">
                <span className="flex items-center gap-1 rounded-[7px] border border-panel/20 bg-panel/15 px-2 py-0.5">
                  <span className="font-mono text-[8.5px] font-semibold text-panel/75 tabular-nums leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-medium text-panel leading-none">
                    {step}
                  </span>
                </span>
                {index < LUMINA_STEPS.length - 1 ? (
                  <ArrowRight
                    aria-hidden
                    strokeWidth={2.4}
                    className="size-2.5 shrink-0 text-panel/50"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Sparkles
        aria-hidden
        strokeWidth={1.6}
        className="pointer-events-none absolute top-2.5 right-2.5 size-3.5 text-panel/45"
      />
    </div>
  );
}

function AgentLane({
  agent,
  index,
  selected,
  onSelect,
}: {
  agent: DetectorAgent;
  index: number;
  selected: boolean;
  onSelect: (agent: DetectorAgent) => void;
}) {
  const { label } = STAGE_LABEL[agent];
  const display = AGENT_DISPLAY_NAME[agent];
  const mechanisms = AGENT_MECHANISM[agent];

  return (
    <div className="group/agent relative flex h-full flex-1 cursor-pointer flex-col">
      <span
        aria-hidden
        className="absolute -top-[6px] left-1/2 z-20 grid size-3 -translate-x-1/2 place-items-center rounded-full border-2 border-brand bg-panel shadow-orb"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 z-0 rounded-[24px] bg-brand/30 opacity-0 blur-xl transition-opacity duration-300 ease-out group-focus-within/agent:opacity-100 group-hover/agent:opacity-100"
      />
      <Card
        data-agent={agent}
        data-selected={selected ? "true" : undefined}
        className={cn(
          "relative z-10 flex h-full flex-1 flex-col gap-0 overflow-hidden rounded-[16px] border bg-panel py-0 ring-0 transition-[box-shadow,transform,border-color] duration-300 ease-out",
          selected
            ? "border-brand-edge ring-2 ring-brand"
            : "border-edge group-hover/agent:-translate-y-1 group-hover/agent:border-brand/70 group-hover/agent:ring-2 group-hover/agent:ring-brand/45 group-focus-within/agent:-translate-y-1 group-focus-within/agent:border-brand/70 group-focus-within/agent:ring-2 group-focus-within/agent:ring-brand/45",
        )}
        style={{
          boxShadow: selected
            ? "0 28px 54px -20px color-mix(in oklab, var(--lumina-brand) 62%, transparent)"
            : "0 22px 44px -24px color-mix(in oklab, var(--lumina-brand) 46%, transparent), 0 1px 2px color-mix(in oklab, var(--lumina-ink) 6%, transparent), inset 0 1px 0 var(--lumina-panel)",
        }}
      >
        {/* The head is the channel identity: a bold brand band over the body. */}
        <div className="relative overflow-hidden border-brand-strong/50 border-b bg-gradient-to-br from-brand-glow via-brand to-brand-strong px-3 pt-2 pb-2">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-panel/30"
          />
          <div className="relative flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold text-panel tabular-nums leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[5.5px] text-panel/65 uppercase tracking-[0.18em] leading-none">
              Detektor
            </span>
          </div>
          <div className="relative mt-1.5 flex items-center gap-2">
            <span
              className={cn(
                "relative size-8 shrink-0 rounded-[9px] bg-panel p-[2px] shadow-lift ring-1 ring-panel/70 transition-[box-shadow,transform] duration-200",
                selected
                  ? "ring-2 ring-panel"
                  : "group-hover/agent:scale-[1.04]",
              )}
            >
              <span className="flex size-full items-center justify-center overflow-hidden rounded-[6px]">
                <AgentFace agent={agent} size={32} />
              </span>
            </span>
            <CardTitle className="min-w-0 truncate font-semibold text-[15.5px] text-panel leading-tight tracking-[-0.02em]">
              {display}
            </CardTitle>
          </div>
          <span className="relative mt-0.5 block truncate font-mono text-[6px] text-panel/80 uppercase leading-[1.35] tracking-[0.06em]">
            {label}
          </span>
        </div>
        {/* The body holds what the detector actually reads, on the rail. */}
        <div className="relative flex flex-1 flex-col">
          <div className="flex-1 border-brand-edge/50 border-b bg-brand-tint/55 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[7px] text-ink-mute uppercase tracking-[0.14em]">
                Mekanisme
              </span>
              <span className="font-mono text-[7px] text-brand-ink tabular-nums">
                {String(mechanisms.length).padStart(2, "0")}
              </span>
            </div>
            <ul
              aria-label={`Mekanisme ${display}`}
              className="list-none space-y-1.5"
            >
              {mechanisms.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <span
                    aria-hidden
                    className="mt-[4px] size-[5px] shrink-0 rounded-full bg-brand ring-2 ring-brand-tint"
                  />
                  <span className="text-[10px] font-medium text-ink leading-snug">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto flex items-center justify-between border-edge/70 border-t px-3 py-1.5">
            <span className="font-mono text-[6.5px] text-ink-mute uppercase tracking-[0.12em] transition-colors duration-300 group-hover/agent:text-brand-ink">
              Buka detail
            </span>
            <ArrowRight
              aria-hidden
              strokeWidth={2.2}
              className="size-2.5 text-brand transition-transform duration-300 group-hover/agent:translate-x-0.5"
            />
          </div>
        </div>
      </Card>

      {/*
       * Selecting a lane is a real action: it swaps the right pane to that
       * agent's full brief. An overlay button keeps the whole card clickable
       * without nesting a button around headings and paragraphs.
       */}
      <Button
        type="button"
        variant="ghost"
        aria-label={`Lihat detail ${display}`}
        aria-pressed={selected}
        onClick={() => onSelect(agent)}
        className="absolute inset-0 z-20 h-full w-full cursor-pointer rounded-[16px] p-0 opacity-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand/40"
      />
    </div>
  );
}

/**
 * The pipeline's output: one deterministic score, not a sixth agent.
 *
 * A dark terminal plate closes the value ladder the warm Lumina opens. The
 * middle carries the engine's actual 0–100 axis as tick marks — a scale, not a
 * gauge with a value — and the crew stack on the footer ties the mascots
 * to the single result.
 */
function ScoreNode() {
  return (
    <div className="mt-0.5 flex justify-center">
      <div className="relative mx-auto w-full max-w-[620px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-[30px] bg-brand/20 blur-2xl"
        />
        <div
          className="relative overflow-hidden rounded-[18px] bg-ink ring-1 ring-panel/10"
          style={{
            boxShadow:
              "0 30px 60px -28px color-mix(in oklab, var(--lumina-ink) 72%, transparent), 0 0 0 1px color-mix(in oklab, var(--lumina-brand) 16%, transparent)",
          }}
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, var(--lumina-panel) 0 1px, transparent 1px 4px)",
            }}
          />
          <div className="relative flex items-center gap-3 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-brand text-panel shadow-orb">
              <Sparkles aria-hidden strokeWidth={1.9} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="font-semibold text-[14px] text-panel leading-none">
                  Skor deterministik
                </p>
                <span className="font-mono text-[7.5px] text-panel/45 uppercase tracking-[0.12em] leading-none">
                  engine tunggal · tanpa model
                </span>
              </div>
              {/* The 0–100 axis, drawn as ticks: a range, never a live value. */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="font-mono text-[7px] text-panel/40 tabular-nums leading-none">
                  0
                </span>
                <span aria-hidden className="relative h-2.5 flex-1">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-panel/15" />
                  <span className="absolute inset-0 flex items-center justify-between">
                    {Array.from({ length: 11 }).map((_, tick) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 0–100 tick marks, order never changes
                        key={tick}
                        className={cn(
                          "w-px bg-panel/25",
                          tick === 0 || tick === 10 ? "h-2" : "h-1",
                        )}
                      />
                    ))}
                  </span>
                </span>
                <span className="font-mono text-[7px] text-panel/40 tabular-nums leading-none">
                  100
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end border-panel/10 border-l pl-4">
              <span className="font-mono text-[6.5px] text-panel/40 uppercase tracking-[0.16em] leading-none">
                Rentang
              </span>
              <span className="mt-1.5 font-mono text-[26px] font-semibold text-brand-glow tabular-nums leading-none">
                0–100
              </span>
            </div>
          </div>
          <div className="relative flex items-center justify-between border-panel/10 border-t px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {CREW_SEQUENCE.map((agent) => (
                  <span
                    key={agent}
                    className="flex size-4 items-center justify-center overflow-hidden rounded-full ring-1 ring-panel/30"
                  >
                    <AgentFace agent={agent} size={16} />
                  </span>
                ))}
              </div>
              <ArrowRight
                aria-hidden
                strokeWidth={2.4}
                className="size-2.5 text-brand/70"
              />
              <span className="font-mono text-[7px] text-panel/60 uppercase tracking-[0.14em]">
                1 skor
              </span>
            </div>
            <span className="font-mono text-[7px] text-panel/35 uppercase tracking-[0.12em]">
              {CREW_SEQUENCE.length} agen · 3 langkah
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The lane centres used by the desktop bus; the card grid has four columns. */
const LANES = [0, 1, 2, 3] as const;

/**
 * Column centres for the four-lane grid with its 1.5rem gutter. Using `calc`
 * instead of a guessed percentage keeps every drop on the card's top dot at any
 * container width. `LANE_EDGE` is the centre of the first and last column.
 */
const LANE_EDGE = "calc((100% - 4.5rem) / 8)";
const LANE_EDGE_END = "calc(100% - (100% - 4.5rem) / 8)";
const LANE_MID_1 = "calc(37.5% - 0.1875rem)";
const LANE_MID_2 = "calc(62.5% + 0.1875rem)";

/**
 * A solid rail segment. The diagram is a wiring map, so the connectors are drawn
 * once and stay still: every line visibly joins the node above to the node
 * below, with no marching dots and no broken gaps.
 */
function Rail({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("block w-0.5 bg-brand/60", className)} />
  );
}

/** The horizontal collector shared by the row link. */
function RailBus() {
  return (
    <span aria-hidden className="relative block h-0.5">
      <span
        className="absolute h-0.5 bg-brand/60"
        style={{ left: LANE_EDGE, right: LANE_EDGE }}
      />
    </span>
  );
}

/** Four drops landing on the lane dots, laid out with the card grid. */
function LaneDrops({ height }: { height: string }) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {LANES.map((lane) => (
        <div className="flex justify-center" key={lane}>
          <Rail className={height} />
        </div>
      ))}
    </div>
  );
}

/**
 * The shared collector drawn as an elbow bracket, so the outer lanes peel off
 * the bus on a rounded corner instead of a hard right angle. `down` opens the
 * bus at the top (fan-out); `up` opens it at the bottom (fan-in). The two inner
 * lanes leave through straight drops that meet the bus in a clean tee.
 */
function FanBracket({ direction }: { direction: "down" | "up" }) {
  return (
    <div aria-hidden className="relative h-4">
      <span
        className={cn(
          "absolute inset-y-0 border-brand/60 border-x-2",
          direction === "down"
            ? "rounded-t-[9px] border-t-2"
            : "rounded-b-[9px] border-b-2",
        )}
        style={{ left: LANE_EDGE, right: LANE_EDGE }}
      />
      <span
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-brand/60"
        style={{ left: LANE_MID_1 }}
      />
      <span
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-brand/60"
        style={{ left: LANE_MID_2 }}
      />
      <span
        className={cn(
          "absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full border-2 border-brand bg-panel",
          direction === "down"
            ? "top-0 -translate-y-1/2"
            : "bottom-0 translate-y-1/2",
        )}
      />
    </div>
  );
}

/**
 * The orchestrator's fan-out: one stem leaves Lumina, the rounded collector
 * spreads it across the four lanes, and four drops land on the detector dots.
 */
function FlowFanOut() {
  return (
    <>
      <div className="flex justify-center py-1 lg:hidden">
        <Rail className="h-8" />
      </div>
      <div aria-hidden className="hidden lg:block">
        <div className="flex justify-center">
          <Rail className="h-4" />
        </div>
        <FanBracket direction="down" />
      </div>
    </>
  );
}

/** A small connector node that rounds off a junction. */
function JunctionNode({ left }: { left: string }) {
  return (
    <span
      className="absolute top-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-panel"
      style={{ left }}
    />
  );
}

/**
 * The horizontal collector between the two detector rows. Each lane drops out
 * of the first row, meets the shared bus, and drops again into the row below,
 * so the two rows read as one continuous tree. Nodes cap the junctions so the
 * tee reads as a soft join rather than a bare right angle.
 */
function RowLink() {
  return (
    <div aria-hidden className="relative">
      <LaneDrops height="h-4" />
      <RailBus />
      <LaneDrops height="h-4" />
      <JunctionNode left={LANE_EDGE} />
      <JunctionNode left={LANE_MID_1} />
      <JunctionNode left={LANE_MID_2} />
      <JunctionNode left={LANE_EDGE_END} />
    </div>
  );
}

/**
 * The output side of the tree: the four lanes meet on one rounded collector and
 * a single stem drops into the deterministic score.
 */
function FlowFanIn() {
  return (
    <>
      <div className="flex justify-center py-1 lg:hidden">
        <Rail className="h-8" />
      </div>
      <div aria-hidden className="hidden lg:block">
        <FanBracket direction="up" />
        <div className="flex justify-center">
          <Rail className="h-4" />
        </div>
      </div>
    </>
  );
}
