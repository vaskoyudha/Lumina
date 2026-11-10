"use client";

import {
  Briefcase,
  Check,
  ChevronRight,
  Circle,
  EyeOff,
  Loader2,
  MinusCircle,
  PenLine,
  XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import * as React from "react";
import {
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  type AgentProfile,
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

/**
 * A duration the row can print without wrapping. Detector stages finish in
 * milliseconds; the language stage can take seconds, and `10.923,0 ms` is both
 * harder to read and wider than the ms column.
 */
const durationText = (ms: number) =>
  ms >= 1000 ? `${MS.format(ms / 1000)} s` : `${MS.format(ms)} ms`;

const STATUS_WORD: Record<StageStatus, string> = {
  menunggu: "Menunggu",
  berjalan: "Berjalan",
  selesai: "Selesai",
  temuan: "Temuan",
  dilewati: "Dilewati",
  gagal: "Gagal",
};

// One shared variant so the motion tree never changes shape between renders.
const agentVariants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 30 },
  },
} as const;

function isDetector(id: AgentStage["id"]): id is DetectorAgent {
  // Registry-driven, so a future non-detector stage cannot be indexed as one.
  return Object.hasOwn(AGENT_REGISTRY, id);
}

/**
 * Only these stages look for patterns in the message. `evidence` assembles
 * quotes and `voice` writes language, so neither may print "0 temuan" as if
 * it had run a detector and found nothing.
 */
const SIGNAL_AGENTS: ReadonlySet<AgentStage["id"]> = new Set([
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
]);

function statusText(stage: AgentStage): string {
  if (!SIGNAL_AGENTS.has(stage.id)) return STATUS_WORD[stage.status];
  if (stage.status === "temuan") return `${stage.findings} temuan`;
  if (stage.status === "selesai" && stage.findings === 0) {
    return stage.id === "identity" ? "Tidak melapor" : "Selesai · 0 temuan";
  }
  return STATUS_WORD[stage.status];
}

type GlyphKind =
  | "spin"
  | "check"
  | "finding"
  | "failure"
  | "skip"
  | "quiet"
  | "pending";

function glyphKind(stage: AgentStage): GlyphKind {
  if (stage.status === "berjalan") return "spin";
  if (stage.status === "temuan") return "finding";
  if (stage.status === "selesai") {
    // Identity may decline to report. That is not a success.
    return stage.id === "identity" && stage.findings === 0 ? "quiet" : "check";
  }
  if (stage.status === "gagal") return "failure";
  if (stage.status === "dilewati") return "skip";
  return "pending";
}

function Glyph({
  stage,
  reduced = false,
}: {
  stage: AgentStage;
  reduced?: boolean;
}) {
  const kind = glyphKind(stage);
  const glyph = (() => {
    switch (kind) {
      case "spin":
        return reduced ? (
          <Circle
            aria-hidden
            strokeWidth={2.4}
            className="size-3.5 fill-current"
          />
        ) : (
          <Loader2
            aria-hidden
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
        );
      case "check":
        return <Check aria-hidden strokeWidth={2.2} className="size-3.5" />;
      case "finding":
        // A filled dot, not a tick: this stage found something.
        return (
          <Circle
            aria-hidden
            strokeWidth={2.4}
            className="size-3.5 fill-current text-warn"
          />
        );
      case "failure":
        return (
          <XCircle
            aria-hidden
            strokeWidth={1.8}
            className="size-3.5 text-danger"
          />
        );
      case "skip":
        return (
          <MinusCircle
            aria-hidden
            strokeWidth={1.8}
            className="size-3.5 text-dim"
          />
        );
      case "quiet":
        return (
          <EyeOff aria-hidden strokeWidth={1.8} className="size-3.5 text-dim" />
        );
      default:
        return (
          <Circle aria-hidden strokeWidth={1.8} className="size-3.5 text-dim" />
        );
    }
  })();

  return (
    <span data-glyph={kind} className="flex">
      <span
        key={kind}
        className="flex motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-90 motion-safe:duration-150"
      >
        {glyph}
      </span>
    </span>
  );
}

function signalsFor(
  result: ScoreResult | undefined,
  id: DetectorAgent,
): Signal[] {
  return (result?.signals ?? []).filter(
    (signal) => signal.weight > 0 && signal.agent === id,
  );
}

/** One agent's face in the crew grid: portrait when present, icon otherwise. */
function CrewFace({ profile }: { profile: AgentProfile }) {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line"
      style={{
        backgroundColor: `var(${profile.identity}-soft)`,
        color: `var(${profile.identity})`,
      }}
    >
      {profile.portrait ? (
        <Image
          src={profile.portrait}
          alt=""
          width={28}
          height={28}
          className="size-full object-cover"
        />
      ) : (
        <profile.icon className="size-3.5" />
      )}
    </span>
  );
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "danger" | "warn";
}) {
  return (
    <span
      className={cn(
        "rounded-md border border-line px-1.5 py-0.5 text-[10px] leading-none text-txt/70",
        tone === "danger" && "border-danger/30 text-danger",
        tone === "warn" && "border-warn/30 text-warn",
      )}
    >
      {children}
    </span>
  );
}

function crewTone(status: StageStatus): string {
  switch (status) {
    case "gagal":
      return "text-danger";
    case "temuan":
      return "text-warn";
    case "berjalan":
      return "text-brand-ink";
    case "selesai":
      return "text-txt/70";
    default:
      return "text-dim";
  }
}

function AgentBubble({
  stage,
  result,
  live = false,
  reduced = false,
}: {
  stage: AgentStage;
  result?: ScoreResult;
  live?: boolean;
  reduced?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const profile = isDetector(stage.id) ? AGENT_REGISTRY[stage.id] : null;
  const isSearch = stage.id === "job-search";
  const identity = isSearch
    ? "var(--lumina-agent-job)"
    : profile
      ? `var(${profile.identity})`
      : "var(--lumina-brand)";
  const soft = isSearch
    ? "var(--lumina-agent-job-soft)"
    : profile
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
          "relative min-w-0 rounded-card border border-line border-l-2 bg-panel py-1.5 pr-3 pl-3",
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
                  className="size-full object-cover"
                />
              ) : profile ? (
                <profile.icon className="size-3.5" />
              ) : isSearch ? (
                <Briefcase className="size-3.5" />
              ) : (
                <PenLine className="size-3.5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate font-medium text-[12px] text-txt">
                  {profile?.displayName ?? stage.label}
                </span>
                {profile ? (
                  <span className="sr-only sm:not-sr-only sm:shrink-0 sm:font-mono sm:text-[10px] sm:text-dim">
                    {stage.label}
                  </span>
                ) : null}
              </span>
              {showFlavor ? (
                <span className="line-clamp-1 text-[11px] text-dim leading-snug">
                  {profile?.flavor ?? stage.task}
                </span>
              ) : null}
              {note && !open ? (
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
              <Glyph stage={stage} reduced={reduced} />
              <span>{statusText(stage)}</span>
            </span>
            <span className="tabular w-12 shrink-0 whitespace-nowrap text-right text-[10px] text-txt/70">
              {stage.status === "berjalan" ? "…" : durationText(stage.ms)}
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
            {note ? (
              <p className="text-[11px] text-dim [overflow-wrap:anywhere]">
                {note}
              </p>
            ) : null}
            {profile ? (
              <div className="flex flex-col gap-1">
                <p className="font-mono text-[9px] text-dim uppercase tracking-[0.14em]">
                  Ciri yang dicek
                </p>
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
              </div>
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
            {SIGNAL_AGENTS.has(stage.id) &&
            stage.status === "selesai" &&
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

function runState(stages: readonly AgentStage[]): StageStatus {
  if (stages.some((stage) => stage.status === "gagal")) return "gagal";
  // A stage that is still running is never reported as finished, even when the
  // caller's `live` flag has already moved on (a stale trace must not lie).
  if (stages.some((stage) => stage.status === "berjalan")) return "berjalan";
  if (stages.some((stage) => stage.status === "temuan")) return "temuan";
  return "selesai";
}

/**
 * The one sentence a screen reader hears when a run settles.
 *
 * Exported so the chat shell can keep announcing while the Agents view has
 * replaced the transcript and unmounted this component.
 */
export function runAnnouncement(trace: AgentTrace): string {
  const byId = new Map(trace.stages.map((stage) => [stage.id, stage]));
  const voice = byId.get("voice");
  const specialists = AGENT_SEQUENCE.map((id) => byId.get(id)).filter(
    (stage): stage is AgentStage => Boolean(stage),
  );
  const findings = specialists.reduce((sum, stage) => sum + stage.findings, 0);
  const completed = specialists.filter(
    (stage) => stage.status === "selesai" || stage.status === "temuan",
  ).length;
  const skipped = specialists.filter(
    (stage) => stage.status === "dilewati",
  ).length;
  const failed = specialists.filter((stage) => stage.status === "gagal").length;
  const language =
    voice?.status === "dilewati"
      ? " Jawaban disusun dari templat."
      : voice?.status === "gagal"
        ? " Penyusun bahasa gagal."
        : "";
  const search = byId.get("job-search");
  const searched = search?.note ? ` ${search.note}.` : "";

  if (runState(trace.stages) === "gagal") {
    return `Sebagian pemeriksaan gagal: ${failed} agen gagal, ${completed} selesai, ${skipped} dilewati, ${findings} temuan.${language}${searched}`;
  }
  return `${completed} agen selesai, ${skipped} dilewati, ${findings} temuan.${language}${searched}`;
}

export function AgentRun({
  trace,
  result,
  live = false,
  announce = true,
}: {
  trace: AgentTrace;
  result?: ScoreResult;
  live?: boolean;
  /** The chat shell owns the live region; standalone use keeps its own. */
  announce?: boolean;
}) {
  const byId = new Map(trace.stages.map((stage) => [stage.id, stage]));
  const scoring = byId.get("scoring");
  const voice = byId.get("voice");
  const jobSearch = byId.get("job-search");
  const specialists = AGENT_SEQUENCE.map((id) => byId.get(id)).filter(
    (stage): stage is AgentStage => Boolean(stage),
  );
  const findings = specialists.reduce((sum, stage) => sum + stage.findings, 0);
  const engineMs = Math.max(
    0,
    trace.totalMs - (voice?.ms ?? 0) - (jobSearch?.ms ?? 0),
  );
  const voiceLive = live && voice?.status === "berjalan";
  const state = runState(trace.stages);
  const idle = specialists.length === 0;
  const reduce = useReducedMotion();
  const animated = live && !reduce;
  const clean = specialists.filter(
    (stage) => stage.status === "selesai",
  ).length;
  const withFindings = specialists.filter(
    (stage) => stage.status === "temuan",
  ).length;
  // Statuses never overlap: clean + withFindings + skipped + failed = agents.
  const completed = clean + withFindings;
  const skipped = specialists.filter(
    (stage) => stage.status === "dilewati",
  ).length;
  const failed = specialists.filter((stage) => stage.status === "gagal").length;
  const [announcement, setAnnouncement] = React.useState("");
  const wasLive = React.useRef(live);

  React.useEffect(() => {
    if (!announce) return;
    if (live) {
      wasLive.current = true;
      return;
    }
    if (wasLive.current) setAnnouncement(runAnnouncement(trace));
  }, [announce, live, trace]);

  return (
    <section
      className="flex w-full flex-col gap-2"
      data-live={voiceLive ? "true" : undefined}
      data-run-state={state}
    >
      <motion.div
        data-testid="agent-summary"
        className="rounded-card border border-line bg-panel p-3.5"
        initial={animated ? { opacity: 0, y: 4 } : false}
        animate={animated ? { opacity: 1, y: 0 } : false}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-[12px] text-txt">Orkestrator</span>
          <span className="text-[11px] text-dim">
            {AGENT_SEQUENCE.length} agen{idle ? " siap" : ""}
          </span>
          {idle ? (
            <span className="text-[11px] text-dim/80">
              Belum ada pemeriksaan
            </span>
          ) : state === "berjalan" ? (
            <span className="text-[11px] text-brand-ink">
              {completed} agen selesai ·{" "}
              {voiceLive ? "menyusun jawaban…" : "berjalan…"}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          {failed > 0 ? <Chip tone="danger">{failed} gagal</Chip> : null}
          <Chip>{clean} selesai</Chip>
          {withFindings > 0 ? (
            <Chip tone="warn">{withFindings} dengan temuan</Chip>
          ) : null}
          <Chip>{skipped} dilewati</Chip>
          <Chip>{findings} temuan</Chip>
          <Chip>{durationText(engineMs)}</Chip>
          {voice?.status === "dilewati" ? (
            <Chip>jawaban dari templat</Chip>
          ) : voice?.status === "gagal" ? (
            <Chip tone="danger">penyusun bahasa gagal</Chip>
          ) : null}
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
                  {durationText(scoring.ms)}
                </span>
              ) : null}
              {index < 2 ? <span aria-hidden>→</span> : null}
            </li>
          ))}
        </ol>
      </motion.div>

      <ul
        aria-label="Agen yang bertugas"
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
      >
        {AGENT_SEQUENCE.map((id) => {
          const profile = AGENT_REGISTRY[id];
          const stage = byId.get(id);
          const status = stage?.status ?? "menunggu";
          return (
            <li
              key={id}
              data-testid={`agent-card-${id}`}
              data-status={status}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-card border border-line bg-panel px-2.5 py-2",
                status === "gagal" && "border-danger/30 bg-danger/5",
              )}
            >
              <CrewFace profile={profile} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-1">
                  <span className="truncate font-medium text-[11.5px] text-txt">
                    {profile.displayName}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] leading-none",
                      crewTone(status),
                    )}
                  >
                    {STATUS_WORD[status]}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-1">
                  <span className="truncate font-mono text-[9px] text-dim uppercase tracking-[0.12em]">
                    {profile.label}
                  </span>
                  {stage && stage.status !== "berjalan" ? (
                    <span className="tabular shrink-0 text-[9px] text-txt/60">
                      {durationText(stage.ms)}
                    </span>
                  ) : null}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <motion.ol
        className="flex flex-col gap-1.5"
        data-motion-list={animated ? "true" : "false"}
        initial={animated ? "hidden" : false}
        animate={animated ? "show" : false}
        variants={{
          show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
        }}
      >
        {specialists.map((stage) => (
          <motion.li
            key={stage.id}
            variants={agentVariants}
            className="min-w-0"
          >
            <AgentBubble
              stage={stage}
              result={result}
              live={live && stage.status === "berjalan"}
              reduced={reduce ?? false}
            />
          </motion.li>
        ))}
        {jobSearch ? (
          <motion.li
            key={jobSearch.id}
            variants={agentVariants}
            className="min-w-0"
          >
            <AgentBubble
              stage={jobSearch}
              result={result}
              live={live && jobSearch.status === "berjalan"}
              reduced={reduce ?? false}
            />
          </motion.li>
        ) : null}
        {voice ? (
          <motion.li
            key={voice.id}
            variants={agentVariants}
            className="min-w-0"
          >
            <AgentBubble
              stage={voice}
              result={result}
              live={live}
              reduced={reduce ?? false}
            />
          </motion.li>
        ) : null}
      </motion.ol>

      {announce ? (
        <output className="sr-only" aria-live="polite">
          {announcement}
        </output>
      ) : null}
    </section>
  );
}
