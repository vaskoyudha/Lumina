"use client";

import {
  ArrowRight,
  Check,
  Download,
  Link2,
  Maximize2,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
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
  AGENT_SEQUENCE,
  type DetectorAgent,
  LUMINA_STEPS,
} from "@/components/companion/agents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

/**
 * Agents — the detector overview shown in the center column.
 *
 * Static by design. The right-hand pane is the live surface on the conversation
 * and the explanatory surface here; this view only answers who checks a message
 * and what each one looks for. The connectors are decorative: they loop to show
 * direction, never to claim that a stage is running. No trace is read here.
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
}: {
  onSelect: (agent: DetectorAgent) => void;
  selected?: DetectorAgent | null;
  onExport: () => void;
  onCopyLink: () => void;
  copied?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="border-field border-b pt-6 pb-4 shadow-sm">
        <div className="w-full px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="min-w-0">
              <h1
                id="agen-pemeriksa-title"
                className="font-bold text-[22px] text-txt tracking-tight sm:text-2xl"
              >
                Agen pemeriksa
              </h1>
              <p className="mt-0.5 font-medium text-dim text-xs sm:text-[13px]">
                Lima agen, satu skor deterministik.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={copied ? "Tautan disalin" : "Salin tautan"}
                onClick={onCopyLink}
                className="size-10 shrink-0 rounded-xl border border-line bg-panel text-ink-soft shadow-sm transition-colors hover:bg-panel-2 hover:text-txt"
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
                className="h-10 gap-1.5 rounded-xl border border-line bg-panel px-3 text-xs font-medium text-txt shadow-sm transition-colors hover:bg-panel-2"
              >
                <Download aria-hidden strokeWidth={1.7} className="size-3.5" />
                Ekspor percakapan
              </Button>
              <Button
                asChild
                size="sm"
                className="h-10 rounded-xl bg-ink px-3.5 text-xs font-medium text-bg hover:bg-ink-hover"
              >
                <Link href="/darurat">Mode darurat</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-5 pt-4 pb-8 sm:px-8">
        {/*
         * The diagram lives on its own pannable canvas — drag to move, wheel or
         * the controls to zoom. The field is present at every width so the
         * figure keeps its identity; below `lg` the canvas chrome disappears and
         * the diagram renders in normal document flow, so the wrapped grid stays
         * readable and page scrolling is never trapped.
         */}
        <DiagramCanvas>
          <LuminaCard />

          <Connector reduced={reduced} size="tall" />

          {/*
           * Each column is one channel: the detector and the mechanisms it
           * checks live in the same tall card, so the agents read as parallel
           * lanes rather than disconnected boxes.
           */}
          <ul className="mt-1 grid list-none grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
            {AGENT_SEQUENCE.map((agent, index) => (
              <li key={agent} className="flex min-w-0 flex-col">
                <AgentLane
                  agent={agent}
                  index={index}
                  onSelect={onSelect}
                  selected={selected === agent}
                />
                <div className="hidden lg:block">
                  <Connector reduced={reduced} size="card" />
                </div>
              </li>
            ))}
          </ul>

          <Connector reduced={reduced} size="tall" />
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
 * Modelled on the 9Router topology canvas: drag to pan, wheel to zoom, and a
 * compact + / − / fit control. The ground is warm paper with a technical grid,
 * a bloom behind the core, and a lift under the result. Below `lg` the chrome
 * disappears and the diagram renders in normal document flow, so the wrapped
 * grid stays readable and page scrolling is never trapped. Nothing here reads
 * live state.
 */
function DiagramCanvas({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLElement>(null);
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
    transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
    transformOrigin: "center",
  };

  return (
    <section
      ref={canvasRef}
      aria-label="Kanvas diagram alur agen"
      onClickCapture={onClickCapture}
      onPointerDown={onPointerDown}
      className={cn(
        "relative mt-5 overflow-hidden rounded-[26px] border border-brand-edge/60 p-3 sm:p-4 lg:h-[760px] lg:p-0 lg:touch-none",
        dragging ? "lg:cursor-grabbing lg:select-none" : "lg:cursor-grab",
      )}
      style={{
        backgroundColor:
          "color-mix(in oklab, var(--lumina-brand-tint) 66%, var(--lumina-brand-edge-soft))",
        boxShadow:
          "0 44px 90px -40px color-mix(in oklab, var(--lumina-brand) 46%, transparent), 0 2px 6px color-mix(in oklab, var(--lumina-ink) 7%, transparent), inset 0 1px 0 var(--lumina-panel), inset 0 0 120px color-mix(in oklab, var(--lumina-brand) 8%, transparent)",
      }}
    >
      {/* Warm paper: a bloom behind the core, a lift under the result. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 42% at 50% -8%, color-mix(in oklab, var(--lumina-brand-edge) 80%, transparent) 0%, transparent 66%), radial-gradient(ellipse 46% 28% at 50% 106%, color-mix(in oklab, var(--lumina-brand-soft) 82%, transparent) 0%, transparent 70%)",
        }}
      />
      {/* Fine technical grid — the drawing surface, not a texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--lumina-brand-edge) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 45%, transparent 100%)",
        }}
      />
      {/* Corner vignette keeps the eye on the pipeline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 62%, color-mix(in oklab, var(--lumina-brand-edge-soft) 90%, transparent) 100%)",
        }}
      />
      {/* Frame: a light top edge and a hairline inner boundary. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-panel to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 hidden rounded-[20px] border border-ink/8 lg:block"
      />
      {/* Registration marks: a technical sheet, not a screenshot. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-3 left-3 hidden size-2 border-brand/40 border-t border-l lg:block"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-3 right-3 hidden size-2 border-brand/40 border-t border-r lg:block"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-3 hidden size-2 border-brand/40 border-b border-l lg:block"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 bottom-3 hidden size-2 border-brand/40 border-r border-b lg:block"
      />

      <div className="relative lg:flex lg:h-full lg:items-center lg:justify-center">
        <div
          ref={contentRef}
          className={cn(
            "w-full lg:px-8 lg:pt-12 lg:pb-8",
            !dragging &&
              !reduced &&
              "lg:transition-transform lg:duration-200 lg:ease-out",
          )}
          style={contentStyle}
        >
          {children}
        </div>
      </div>

      <div
        className="absolute top-4 right-4 hidden overflow-hidden rounded-[11px] border border-edge bg-panel/95 shadow-rest backdrop-blur-md lg:flex lg:items-stretch"
        data-no-pan
      >
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

      <div className="pointer-events-none absolute top-4 left-4 hidden items-center gap-2.5 lg:flex">
        <span className="grid size-5 place-items-center rounded-[5px] bg-brand font-mono text-[8px] font-bold text-panel shadow-orb">
          01
        </span>
        <span className="font-mono text-[8.5px] text-ink-soft uppercase tracking-[0.18em]">
          Alur pemeriksaan
        </span>
        <span aria-hidden className="h-px w-8 bg-brand/30" />
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
    <div className="relative mx-auto w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[34px] bg-brand/25 blur-2xl"
      />
      <Card
        data-agent="lumina"
        className="relative gap-0 overflow-hidden rounded-[24px] border-0 bg-brand-strong py-0 ring-1 ring-panel/20"
        style={{
          boxShadow:
            "0 34px 70px -24px color-mix(in oklab, var(--lumina-brand) 66%, transparent), inset 0 1px 0 color-mix(in oklab, var(--lumina-panel) 44%, transparent)",
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
        <CardHeader className="relative flex flex-row items-center gap-4 px-5 pt-4 pb-0">
          <span className="relative grid size-[68px] shrink-0 place-items-center rounded-[20px] bg-panel shadow-[0_14px_30px_-10px_rgba(0,0,0,0.55)] ring-1 ring-panel/70">
            <LuminaLogo variant="mark" className="size-[52px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-semibold text-[22px] text-panel leading-tight tracking-[-0.03em]">
                Lumina
              </CardTitle>
              <Badge
                variant="outline"
                className="h-auto rounded-full border-panel/30 bg-panel/15 px-2 py-0.5 font-mono text-[9px] font-normal text-panel uppercase tracking-[0.12em]"
              >
                Orkestrator
              </Badge>
            </div>
            <p className="mt-1 text-[12.5px] text-panel/85 leading-snug">
              Satu engine deterministik yang menjalankan seluruh agen.
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 pr-1 sm:flex">
            <div className="flex -space-x-2.5">
              {AGENT_SEQUENCE.map((agent) => (
                <span
                  key={agent}
                  className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-panel ring-2 ring-brand-strong"
                >
                  <AgentFace agent={agent} size={32} />
                </span>
              ))}
            </div>
            <span className="font-mono text-[8px] text-panel/70 uppercase tracking-[0.18em] leading-none">
              {String(AGENT_SEQUENCE.length).padStart(2, "0")} agen
            </span>
          </div>
        </CardHeader>
        <CardContent className="relative mt-3.5 border-panel/25 border-t px-5 py-3">
          <ol className="flex list-none flex-wrap items-center gap-x-1.5 gap-y-1.5">
            {LUMINA_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-[9px] border border-panel/20 bg-panel/15 px-2.5 py-1">
                  <span className="font-mono text-[9.5px] font-semibold text-panel/75 tabular-nums leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] font-medium text-panel leading-none">
                    {step}
                  </span>
                </span>
                {index < LUMINA_STEPS.length - 1 ? (
                  <ArrowRight
                    aria-hidden
                    strokeWidth={2.4}
                    className="size-3 shrink-0 text-panel/50"
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
        className="pointer-events-none absolute top-3.5 right-3.5 size-4 text-panel/50"
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
    <div className="relative flex h-full flex-1 flex-col">
      <span
        aria-hidden
        className="absolute -top-[6px] left-1/2 z-20 grid size-3 -translate-x-1/2 place-items-center rounded-full border-2 border-brand bg-panel shadow-orb"
      />
      <Card
        data-agent={agent}
        data-selected={selected ? "true" : undefined}
        className={cn(
          "group/agent relative flex h-full flex-1 flex-col gap-0 overflow-hidden rounded-[18px] border bg-panel py-0 ring-0 transition-[box-shadow,transform,border-color] duration-200",
          selected
            ? "border-brand-edge ring-2 ring-brand"
            : "border-edge hover:-translate-y-0.5 hover:border-brand-edge",
        )}
        style={{
          boxShadow: selected
            ? "0 28px 54px -20px color-mix(in oklab, var(--lumina-brand) 62%, transparent)"
            : "0 22px 44px -24px color-mix(in oklab, var(--lumina-brand) 46%, transparent), 0 1px 2px color-mix(in oklab, var(--lumina-ink) 6%, transparent), inset 0 1px 0 var(--lumina-panel)",
        }}
      >
        {/* The head is the channel identity: a bold brand band over the body. */}
        <div className="relative overflow-hidden border-brand-strong/50 border-b bg-gradient-to-br from-brand-glow via-brand to-brand-strong px-3 pt-3 pb-3.5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-panel/30"
          />
          <div className="relative flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-panel tabular-nums leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[6px] text-panel/65 uppercase tracking-[0.18em] leading-none">
              Detektor
            </span>
          </div>
          <div className="relative mt-2.5 flex items-center gap-2">
            <span
              className={cn(
                "relative size-10 shrink-0 rounded-[11px] bg-panel p-[2px] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.55)] ring-1 ring-panel/70 transition-[box-shadow,transform] duration-200",
                selected
                  ? "ring-2 ring-panel"
                  : "group-hover/agent:scale-[1.04]",
              )}
            >
              <span className="flex size-full items-center justify-center overflow-hidden rounded-[8px]">
                <AgentFace agent={agent} size={40} />
              </span>
            </span>
            <CardTitle className="min-w-0 truncate font-semibold text-[18px] text-panel leading-tight tracking-[-0.02em]">
              {display}
            </CardTitle>
          </div>
          <span className="relative mt-1.5 block truncate font-mono text-[6.5px] text-panel/80 uppercase leading-[1.35] tracking-[0.06em]">
            {label}
          </span>
        </div>
        {/* The body holds what the detector actually reads, on the rail. */}
        <div className="flex-1 border-brand-edge/50 border-b bg-brand-tint/60 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[7.5px] text-ink-mute uppercase tracking-[0.14em]">
              Mekanisme
            </span>
            <span className="font-mono text-[7.5px] text-brand-ink tabular-nums">
              {String(mechanisms.length).padStart(2, "0")}
            </span>
          </div>
          <ul aria-label={`Mekanisme ${display}`} className="list-none">
            {mechanisms.map((item, itemIndex) => {
              const last = itemIndex === mechanisms.length - 1;

              return (
                <li
                  key={item}
                  className={cn(
                    "relative pl-[15px]",
                    last ? undefined : "pb-1.5",
                  )}
                >
                  {last ? null : (
                    <span
                      aria-hidden
                      className="absolute top-[9px] -bottom-1.5 left-[2.5px] border-l border-dashed border-brand/40"
                    />
                  )}
                  <span
                    aria-hidden
                    className="absolute top-[6px] left-0 size-[6px] rounded-full bg-brand ring-2 ring-brand-tint"
                  />
                  <span className="inline-flex min-h-[28px] items-center gap-1.5 rounded-[6px] border border-brand-edge/70 bg-panel py-[3px] pr-2 pl-1.5 text-left text-[10px] font-medium text-ink leading-[1.3] whitespace-normal shadow-[0_1px_2px_color-mix(in_oklab,var(--lumina-ink)_6%,transparent)]">
                    <span
                      aria-hidden
                      className="h-3.5 w-[2px] shrink-0 rounded-full bg-brand"
                    />
                    {item}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-auto flex items-center justify-between border-edge/70 border-t px-3.5 py-2.5">
          <span className="font-mono text-[7px] text-ink-mute uppercase tracking-[0.12em] transition-colors duration-200 group-hover/agent:text-brand-ink">
            Lihat peran
          </span>
          <ArrowRight
            aria-hidden
            strokeWidth={2.2}
            className="size-3 text-brand transition-[transform] duration-200 group-hover/agent:translate-x-0.5"
          />
        </div>
      </Card>

      {/*
       * Selecting a lane is a real action: it highlights and scrolls to that
       * agent's brief in the right pane. An overlay button keeps the whole card
       * clickable without nesting a button around headings and paragraphs.
       */}
      <Button
        type="button"
        variant="ghost"
        aria-label={`Lihat detail ${display}`}
        aria-pressed={selected}
        onClick={() => onSelect(agent)}
        className="absolute inset-0 h-full w-full rounded-[18px] p-0 opacity-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand/40"
      />
    </div>
  );
}

/** One dash period of the flowing rails: a 1.8px dot every 8px. */
const RAIL_PERIOD = 8;

/**
 * The shared clock for every flowing rail. Linear because the pattern is
 * periodic: one period per cycle loops without a seam, so the line reads as an
 * endless march rather than a pulse. Identical timing keeps the whole diagram
 * flowing as one system instead of unrelated loops.
 */
const RAIL_FLOW = {
  duration: 0.9,
  ease: "linear",
  repeat: Number.POSITIVE_INFINITY,
} as const;

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
    <div className="mt-1 flex justify-center">
      <div className="relative w-full">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-5 rounded-[34px] bg-brand/25 blur-2xl"
        />
        <div
          className="relative overflow-hidden rounded-[22px] bg-ink ring-1 ring-panel/10"
          style={{
            boxShadow:
              "0 40px 76px -28px color-mix(in oklab, var(--lumina-ink) 78%, transparent), 0 0 0 1px color-mix(in oklab, var(--lumina-brand) 18%, transparent)",
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
          <div className="relative flex items-center gap-4 px-5 py-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-brand text-panel shadow-orb">
              <Sparkles aria-hidden strokeWidth={1.9} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <p className="font-semibold text-[16px] text-panel leading-none">
                  Skor deterministik
                </p>
                <span className="font-mono text-[8px] text-panel/45 uppercase tracking-[0.14em] leading-none">
                  engine tunggal · tanpa model
                </span>
              </div>
              {/* The 0–100 axis, drawn as ticks: a range, never a live value. */}
              <div className="mt-3.5 flex items-center gap-2.5">
                <span className="font-mono text-[7.5px] text-panel/40 tabular-nums leading-none">
                  0
                </span>
                <span aria-hidden className="relative h-3 flex-1">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-panel/15" />
                  <span className="absolute inset-0 flex items-center justify-between">
                    {Array.from({ length: 11 }).map((_, tick) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 0–100 tick marks, order never changes
                        key={tick}
                        className={cn(
                          "w-px bg-panel/25",
                          tick === 0 || tick === 10 ? "h-2.5" : "h-1.5",
                        )}
                      />
                    ))}
                  </span>
                </span>
                <span className="font-mono text-[7.5px] text-panel/40 tabular-nums leading-none">
                  100
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end border-panel/10 border-l pl-5">
              <span className="font-mono text-[7px] text-panel/40 uppercase tracking-[0.16em] leading-none">
                Rentang
              </span>
              <span className="mt-2 font-mono text-[34px] font-semibold text-brand-glow tabular-nums leading-none">
                0–100
              </span>
            </div>
          </div>
          <div className="relative flex items-center justify-between border-panel/10 border-t px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-1.5">
                {AGENT_SEQUENCE.map((agent) => (
                  <span
                    key={agent}
                    className="flex size-5 items-center justify-center overflow-hidden rounded-full ring-1 ring-panel/30"
                  >
                    <AgentFace agent={agent} size={20} />
                  </span>
                ))}
              </div>
              <ArrowRight
                aria-hidden
                strokeWidth={2.4}
                className="size-3 text-brand/70"
              />
              <span className="font-mono text-[8px] text-panel/60 uppercase tracking-[0.14em]">
                1 skor
              </span>
            </div>
            <span className="font-mono text-[7.5px] text-panel/35 uppercase tracking-[0.12em]">
              {AGENT_SEQUENCE.length} agen · 3 langkah
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One dotted path whose pattern marches by exactly one dash period — the rail
 * itself flows, with no separate dot and no path-drawing reveal. The pattern is
 * a 1.8px round dot every 8px, so a −8px offset loops seamlessly. A wider,
 * fainter copy underneath gives each dot a soft halo. Under reduced motion the
 * same rail renders, still dotted and still directional, just still.
 */
function FlowingPath({ d, reduced }: { d: string; reduced: boolean }) {
  const animate = reduced ? undefined : { strokeDashoffset: [0, -RAIL_PERIOD] };

  return (
    <g>
      {/* A continuous glowing trace under the marching dots binds the lane. */}
      <path
        d={d}
        stroke="var(--lumina-brand)"
        strokeLinecap="round"
        strokeOpacity={0.18}
        strokeWidth={8}
      />
      <path
        d={d}
        stroke="var(--lumina-brand)"
        strokeLinecap="round"
        strokeOpacity={0.5}
        strokeWidth={2.2}
      />
      <motion.path
        animate={animate}
        d={d}
        stroke="var(--lumina-brand)"
        strokeDasharray="0.1 7.9"
        strokeLinecap="round"
        strokeOpacity={0.28}
        strokeWidth={7}
        transition={RAIL_FLOW}
      />
      <motion.path
        animate={animate}
        d={d}
        stroke="var(--lumina-brand-strong)"
        strokeDasharray="0.1 7.9"
        strokeLinecap="round"
        strokeOpacity={1}
        strokeWidth={2.5}
        transition={RAIL_FLOW}
      />
    </g>
  );
}

/**
 * A vertical dotted connector that flows downward.
 *
 * `tall` is the single entry arrow under Lumina when the agent grid wraps;
 * `card` is one of the fan-out drops onto a detector, or the link from a
 * detector to its mechanism lane. The dash pattern itself marches; the chevron
 * stays put as the destination marker. Under reduced motion nothing moves.
 */
function Connector({
  reduced,
  size,
}: {
  reduced: boolean;
  size: "tall" | "card";
}) {
  const tall = size === "tall";
  const height = tall ? 34 : 26;
  const lineEnd = tall ? 27 : 19;

  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center",
        tall ? "h-[34px]" : "h-[26px]",
      )}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height={height}
        viewBox={`0 0 14 ${height}`}
        width="14"
      >
        <FlowingPath d={`M7 0v${lineEnd}`} reduced={reduced} />
        <path
          d={`m2.5 ${lineEnd - 3.5} 4.5 5 4.5-5`}
          stroke="var(--lumina-brand)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    </div>
  );
}
