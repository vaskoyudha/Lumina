"use client";

import {
  Check,
  ChevronRight,
  Circle,
  Loader2,
  MinusCircle,
  PenLine,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import {
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  type DetectorAgent,
  LUMINA_STEPS,
} from "@/components/companion/agents";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  AgentStage,
  AgentTrace,
  StageStatus,
} from "@/lib/contracts/agent-run";
import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { cn } from "@/lib/utils";

const MS = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const STATUS_WORD: Record<StageStatus, string> = {
  menunggu: "Menunggu",
  berjalan: "Berjalan",
  selesai: "Selesai",
  temuan: "Temuan",
  dilewati: "Dilewati",
  gagal: "Gagal",
};

function isDetector(id: AgentStage["id"]): id is DetectorAgent {
  return id !== "scoring" && id !== "voice";
}

function statusText(stage: AgentStage): string {
  if (stage.status === "temuan") return `${stage.findings} temuan`;
  if (stage.status === "selesai" && stage.findings === 0) {
    return stage.id === "identity" ? "Tidak melapor" : "Selesai · 0 temuan";
  }
  return STATUS_WORD[stage.status];
}

function Glyph({ status }: { status: StageStatus }) {
  if (status === "berjalan") {
    return (
      <Loader2
        aria-hidden
        className="size-3.5 animate-spin motion-reduce:animate-none"
      />
    );
  }
  if (status === "temuan" || status === "selesai") {
    return <Check aria-hidden strokeWidth={2.2} className="size-3.5" />;
  }
  if (status === "gagal") {
    return (
      <XCircle aria-hidden strokeWidth={1.8} className="size-3.5 text-danger" />
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
  return <Circle aria-hidden strokeWidth={1.8} className="size-3.5 text-dim" />;
}

function signalsFor(
  result: ScoreResult | undefined,
  id: DetectorAgent,
): Signal[] {
  return (result?.signals ?? []).filter(
    (signal) => signal.weight > 0 && signal.agent === id,
  );
}

function AgentBubble({
  stage,
  result,
  live = false,
}: {
  stage: AgentStage;
  result?: ScoreResult;
  live?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const profile = isDetector(stage.id) ? AGENT_REGISTRY[stage.id] : null;
  const identity = profile ? `var(${profile.identity})` : "var(--lumina-brand)";
  const soft = profile
    ? `var(${profile.identity}-soft)`
    : "var(--lumina-brand-soft)";
  const signals = profile ? signalsFor(result, profile.id) : [];
  const explain = stage.status === "dilewati" || stage.status === "gagal";
  const note = stage.note ?? (explain ? "Tidak ada alasan tercatat." : null);
  const showFlavor = live || open;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        data-testid={`agent-${stage.id}`}
        data-status={stage.status}
        aria-busy={stage.status === "berjalan" || undefined}
        style={{ borderLeftColor: identity }}
        className={cn(
          "relative min-w-0 rounded-r-[12px] border-l-2 py-1.5 pr-3 pl-3",
          stage.status === "gagal" && "bg-danger/5",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-[44px] w-full min-w-0 items-center gap-2 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
          >
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line"
              style={{ backgroundColor: soft, color: identity }}
            >
              {profile?.portrait ? (
                <Image
                  src={profile.portrait}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 object-cover"
                />
              ) : profile ? (
                <profile.icon className="size-3.5" />
              ) : (
                <PenLine className="size-3.5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate font-medium text-[12px] text-txt">
                  {profile?.displayName ?? stage.label}
                </span>
                <span className="sr-only sm:not-sr-only sm:shrink-0 sm:font-mono sm:text-[10px] sm:text-dim">
                  {stage.label}
                </span>
              </span>
              {showFlavor ? (
                <span className="line-clamp-1 text-[11px] text-dim leading-snug">
                  {profile?.flavor ?? stage.task}
                </span>
              ) : null}
              {note ? (
                <span className="line-clamp-2 text-[11px] text-dim leading-snug">
                  {note}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 text-[11px]",
                stage.status === "gagal" ? "text-danger" : "text-txt/70",
              )}
            >
              <Glyph status={stage.status} />
              <span>{statusText(stage)}</span>
            </span>
            <span className="tabular w-12 shrink-0 text-right text-[10px] text-txt/70">
              {stage.status === "berjalan" ? "…" : `${MS.format(stage.ms)} ms`}
            </span>
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-dim transition-transform duration-150 motion-reduce:transition-none",
                open && "rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>

        {/*
          Radix unmounts closed content, so task, mechanisms, caveat, and
          evidence never sit in the accessibility tree while the row is
          collapsed. The trigger keeps the honest note for skipped/failed
          stages visible without expanding.
        */}
        <CollapsibleContent className="overflow-hidden">
          <div className="mt-1 flex flex-col gap-2 pb-1">
            <p className="text-[11px] text-dim">{stage.task}</p>
            {profile ? (
              <ul className="flex flex-wrap gap-1">
                {profile.mechanism.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-line px-2 py-0.5 text-[10px] text-dim"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            ) : null}
            {profile?.caveat ? (
              <p className="text-[11px] text-dim">{profile.caveat}</p>
            ) : null}
            {signals.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {signals.map((signal) => (
                  <li key={signal.label} className="text-[11px] text-txt">
                    <span className="font-medium">{signal.label}</span>
                    {signal.evidence ? (
                      <span className="mt-0.5 block text-dim [overflow-wrap:anywhere]">
                        “{signal.evidence}”
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {stage.status === "selesai" &&
            stage.findings === 0 &&
            !stage.note ? (
              <p className="text-[11px] text-dim">
                Agen ini selesai dan tidak menemukan pola yang dikenali.
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function runState(stages: readonly AgentStage[], live: boolean): StageStatus {
  if (stages.some((stage) => stage.status === "gagal")) return "gagal";
  if (
    live &&
    stages.some((stage) => stage.id === "voice" && stage.status === "berjalan")
  ) {
    return "berjalan";
  }
  if (stages.some((stage) => stage.status === "temuan")) return "temuan";
  return "selesai";
}

export function AgentRun({
  trace,
  result,
  live = false,
}: {
  trace: AgentTrace;
  result?: ScoreResult;
  live?: boolean;
}) {
  const byId = new Map(trace.stages.map((stage) => [stage.id, stage]));
  const scoring = byId.get("scoring");
  const voice = byId.get("voice");
  const specialists = AGENT_SEQUENCE.map((id) => byId.get(id)).filter(
    (stage): stage is AgentStage => Boolean(stage),
  );
  const findings = specialists.reduce((sum, stage) => sum + stage.findings, 0);
  const engineMs = Math.max(0, trace.totalMs - (voice?.ms ?? 0));
  const voiceLive = live && voice?.status === "berjalan";
  const state = runState(trace.stages, live);
  const completed = specialists.filter(
    (stage) => stage.status === "selesai" || stage.status === "temuan",
  ).length;
  const skipped = specialists.filter(
    (stage) => stage.status === "dilewati",
  ).length;
  const failed = specialists.filter((stage) => stage.status === "gagal").length;
  const [announcement, setAnnouncement] = React.useState("");
  const wasLive = React.useRef(live);

  React.useEffect(() => {
    if (live) {
      wasLive.current = true;
      return;
    }
    if (wasLive.current) {
      setAnnouncement(
        state === "gagal"
          ? "Sebagian pemeriksaan gagal. Lihat alasan di setiap agen."
          : `${completed} agen selesai, ${skipped} dilewati, ${findings} temuan.`,
      );
    }
  }, [live, state, completed, skipped, findings]);

  return (
    <section
      className="flex w-full flex-col gap-2"
      data-live={voiceLive ? "true" : undefined}
      data-run-state={state}
    >
      <div className="rounded-[14px] border border-line bg-panel px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-[12px] text-txt">Orkestrator</span>
          <span className="text-[11px] text-dim">
            {specialists.length} agen
          </span>
          {voiceLive ? (
            <span className="text-[11px] text-brand-ink">
              {completed} agen selesai · menyusun jawaban…
            </span>
          ) : (
            <span className="tabular text-[11px] text-dim">
              {state === "gagal" ? `${failed} gagal · ` : ""}
              {completed} selesai · {skipped} dilewati · {findings} temuan ·{" "}
              {MS.format(engineMs)} ms
            </span>
          )}
        </div>
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-dim">
          {LUMINA_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-1">
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border text-[9px]",
                  index < 2 || scoring
                    ? "border-brand-edge bg-brand-soft text-brand-ink"
                    : "border-line text-dim",
                )}
              >
                {index + 1}
              </span>
              <span>{step}</span>
              {index === 2 && scoring ? (
                <span className="tabular text-[10px] text-txt/70">
                  {MS.format(scoring.ms)} ms
                </span>
              ) : null}
              {index < 2 ? <span aria-hidden>→</span> : null}
            </li>
          ))}
        </ol>
        <ul aria-hidden className="mt-2 flex -space-x-1.5">
          {specialists.slice(0, 8).map((stage) => {
            const profile = isDetector(stage.id)
              ? AGENT_REGISTRY[stage.id]
              : null;
            return (
              <li
                key={stage.id}
                className="flex size-5 items-center justify-center overflow-hidden rounded-full border border-panel"
                style={{
                  backgroundColor: profile
                    ? `var(${profile.identity}-soft)`
                    : "var(--lumina-brand-soft)",
                  color: profile ? `var(${profile.identity})` : undefined,
                }}
              >
                {profile?.portrait ? (
                  <Image
                    src={profile.portrait}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 object-cover"
                  />
                ) : profile ? (
                  <profile.icon className="size-2.5" />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <ol className="ms-3 flex flex-col border-l border-line">
        {specialists.map((stage) => (
          <li key={stage.id} className="min-w-0">
            <AgentBubble
              stage={stage}
              result={result}
              live={live && stage.status === "berjalan"}
            />
          </li>
        ))}
        {voice ? (
          <li className="min-w-0">
            <AgentBubble stage={voice} result={result} live={live} />
          </li>
        ) : null}
      </ol>

      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>
    </section>
  );
}
