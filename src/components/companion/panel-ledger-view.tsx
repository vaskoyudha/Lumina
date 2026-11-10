"use client";

import {
  ChevronDown,
  CircleDashed,
  type LucideIcon,
  ScanSearch,
  Waypoints,
} from "lucide-react";
import type { ReactNode } from "react";
import { AgentInfoHint } from "@/components/companion/agent-info-popover";
import {
  AGENT_REGISTRY,
  type DetectorAgent,
} from "@/components/companion/agents";
import type {
  PanelAgent,
  PanelLedger,
  PanelOutcome,
} from "@/components/companion/panel-ledger";
import type {
  SpawnedAgent,
  SpawnStatus,
} from "@/components/companion/spawn-ledger";
import { StatusPulse } from "@/components/companion/status-pulse";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type AgentTrace, STAGE_LABEL } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

const OUTCOME_TICK: Record<PanelOutcome, string> = {
  finding: "bg-warn",
  clean: "bg-brand",
  no_object: "bg-ink-faint",
  failed: "bg-danger",
  live: "bg-brand-strong",
  pending: "bg-dot",
};

const SPAWN_LABEL: Record<SpawnStatus, string> = {
  berjalan: "Berjalan",
  selesai: "Selesai",
  gagal: "Gagal",
  dilewati: "Dilewati",
};

const SPAWN_TONE: Record<SpawnStatus, string> = {
  berjalan: "bg-brand-soft text-brand",
  selesai: "bg-chip text-dim",
  gagal: "bg-danger/10 text-danger",
  dilewati: "bg-chip text-dim",
};

const OUTCOME_LABEL: Record<PanelOutcome, string> = {
  finding: "menemukan",
  clean: "nihil",
  no_object: "tanpa objek",
  failed: "gagal",
  live: "berjalan",
  pending: "belum tercatat",
};

const STAGE_STATUS_LABEL: Record<string, string> = {
  menunggu: "menunggu",
  berjalan: "berjalan",
  selesai: "selesai",
  temuan: "menemukan",
  dilewati: "tanpa objek",
  gagal: "gagal",
};

function formatMs(ms: number): string {
  if (ms < 0.1) return "<0,1 ms";
  return `${ms.toFixed(1).replace(".", ",")} ms`;
}

/**
 * The panel's one icon language, mirroring the reference card headers: a pale
 * peach halo around a solid orange disc with a white glyph. No borders.
 */
export function PanelIcon({
  icon: Icon,
  size = "md",
  tone = "brand",
  className,
  children,
}: {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  tone?: "brand" | "warn" | "danger" | "muted";
  className?: string;
  children?: ReactNode;
}): ReactNode {
  const outer = size === "sm" ? "size-6" : size === "lg" ? "size-9" : "size-7";
  const inner = size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5";
  const glyph =
    size === "sm" ? "size-2.5" : size === "lg" ? "size-4" : "size-3";

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        outer,
        tone === "danger"
          ? "bg-danger/15"
          : tone === "warn"
            ? "bg-warn/15"
            : tone === "muted"
              ? "bg-chip"
              : "bg-brand-soft",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full",
          inner,
          tone === "danger"
            ? "bg-danger text-white"
            : tone === "warn"
              ? "bg-warn text-white"
              : tone === "muted"
                ? "bg-panel text-ink-mute"
                : "bg-brand text-white",
        )}
      >
        <Icon className={glyph} strokeWidth={2.2} />
      </span>
      {children}
    </span>
  );
}

/**
 * A section heading in the panel's card style: a soft circular icon on the
 * left, one shared title size for every section, and room for a count on the
 * right. The icon is decoration and stays out of the accessible name.
 */
export function PanelSectionHeading({
  id,
  icon: Icon,
  tone = "brand",
  meta,
  children,
  className,
}: {
  id?: string;
  icon: LucideIcon;
  tone?: "brand" | "warn" | "danger";
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <PanelIcon icon={Icon} tone={tone} />
      <h3
        className="min-w-0 flex-1 truncate font-semibold text-[12.5px] text-ink tracking-[-0.01em]"
        id={id}
      >
        {children}
      </h3>
      {meta ? <span className="shrink-0">{meta}</span> : null}
    </div>
  );
}

/** Coverage is a sentence first and eight ticks second, never a percentage. */
export function CoverageStrip({ ledger }: { ledger: PanelLedger }) {
  const { counts } = ledger;
  const parts: string[] = [];

  if (counts.checked > 0) parts.push(`${counts.checked} diperiksa`);
  if (counts.finding > 0) parts.push(`${counts.finding} menemukan`);
  if (counts.clean > 0) parts.push(`${counts.clean} nihil`);
  if (counts.noObject > 0) parts.push(`${counts.noObject} tanpa objek`);
  if (counts.failed > 0) parts.push(`${counts.failed} gagal`);
  if (counts.live > 0) parts.push(`${counts.live} berjalan`);
  if (counts.pending > 0) parts.push(`${counts.pending} belum tercatat`);

  const sentence =
    counts.checked === 0 && counts.live === 0
      ? "Tanpa catatan pipeline"
      : parts.join(" · ");

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10.5px] text-dim leading-snug">{sentence}</p>
      <div aria-hidden className="flex gap-1">
        {ledger.agents.map((agent) => (
          <span
            className={cn(
              "h-1.5 flex-1 rounded-full",
              OUTCOME_TICK[agent.outcome],
            )}
            data-coverage-tick
            data-outcome={agent.outcome}
            key={agent.agent}
            title={`${STAGE_LABEL[agent.agent].label}: ${OUTCOME_LABEL[agent.outcome]}`}
          />
        ))}
      </div>
    </div>
  );
}

/** The single findings list. Every row names the agent that produced it. */
export function FindingsSection({
  agents,
  titleId,
  onSelectEvidence,
  onSelectAgent,
}: {
  agents: readonly PanelAgent[];
  titleId: string;
  onSelectEvidence?: (evidence: string) => void;
  onSelectAgent?: (agent: DetectorAgent) => void;
}): ReactNode {
  const total = agents.reduce((sum, agent) => sum + agent.count, 0);

  return (
    <section aria-labelledby={`${titleId}-findings`} className="mt-3">
      <PanelSectionHeading icon={ScanSearch} id={`${titleId}-findings`}>
        {total > 0 ? `Menemukan · ${total}` : "Temuan"}
      </PanelSectionHeading>
      <ul aria-label="Temuan terdeteksi" className="mt-2 flex flex-col gap-2">
        {agents.length === 0 ? (
          <li className="rounded-[10px] border border-edge-soft bg-bg px-2.5 py-2 text-[11.5px] text-dim">
            Tidak ada pola penipuan yang dikenali pada pesan ini.
          </li>
        ) : (
          agents.map((agent) => {
            const Icon = AGENT_REGISTRY[agent.agent].icon;
            return (
              <li
                className="overflow-hidden rounded-[14px] border border-edge bg-panel shadow-rest"
                key={agent.agent}
              >
                <div className="flex items-center gap-2 border-edge-soft border-b px-3 py-2">
                  <button
                    aria-label={`Tampilkan info ${STAGE_LABEL[agent.agent].label}`}
                    className="group/info flex min-w-0 flex-1 items-center gap-2 rounded-[8px] text-left outline-none transition-colors hover:bg-txt/[0.03] focus-visible:ring-2 focus-visible:ring-brand-strong"
                    onClick={() => onSelectAgent?.(agent.agent)}
                    type="button"
                  >
                    <PanelIcon icon={Icon} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-[12px] text-ink">
                      {STAGE_LABEL[agent.agent].label}
                    </span>
                    <AgentInfoHint />
                  </button>
                  <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
                    {agent.count} temuan
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5 p-2">
                  {agent.findings.map((signal) => (
                    <li
                      className="rounded-[10px] border border-edge-soft bg-bg px-2.5 py-2"
                      key={`${signal.label}-${signal.evidence}`}
                    >
                      <p className="font-medium text-[11.5px] text-txt leading-snug">
                        {signal.label}
                      </p>
                      {signal.evidence ? (
                        <p className="mt-1 text-[11px] text-dim leading-snug">
                          “{signal.evidence}”
                        </p>
                      ) : null}
                      {onSelectEvidence && signal.evidence ? (
                        <button
                          aria-label={`Lihat di pesan: ${signal.label}`}
                          className="mt-1.5 rounded-[5px] font-medium text-[10.5px] text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          onClick={() => onSelectEvidence(signal.evidence)}
                          type="button"
                        >
                          Lihat di pesan
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

/**
 * The spawn list: only agents the orchestrator actually started. Unlike the
 * engine roster below, a detector the planner never chose has no row here.
 */
export function SpawnedSection({
  agents,
  titleId,
  onSelectAgent,
}: {
  agents: readonly SpawnedAgent[];
  titleId: string;
  onSelectAgent?: (agent: DetectorAgent) => void;
}): ReactNode {
  if (agents.length === 0) return null;

  return (
    <section aria-labelledby={`${titleId}-spawned`} className="mt-3">
      <PanelSectionHeading icon={Waypoints} id={`${titleId}-spawned`}>
        Sub-agen dijalankan · {agents.length}
      </PanelSectionHeading>
      <ul
        aria-label="Sub-agen yang dijalankan"
        className="mt-2 flex flex-col gap-1.5"
      >
        {agents.map((item) => {
          const profile = AGENT_REGISTRY[item.agent];
          const Icon = profile.icon;
          const live = item.status === "berjalan";

          return (
            <li
              className={cn(
                "rounded-[12px] border px-2.5 py-2",
                live
                  ? "border-brand-edge bg-brand-soft"
                  : "border-edge-soft bg-bg",
              )}
              key={item.agent}
            >
              <button
                aria-label={`Tampilkan info sub-agen ${profile.label}`}
                className="group/info flex w-full items-start gap-2 rounded-[8px] text-left outline-none transition-colors hover:bg-txt/[0.03] focus-visible:ring-2 focus-visible:ring-brand-strong"
                onClick={() => onSelectAgent?.(item.agent)}
                type="button"
              >
                <PanelIcon className="relative" icon={Icon}>
                  {live ? (
                    <StatusPulse
                      className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-brand-strong"
                      kind="opacity"
                    />
                  ) : null}
                </PanelIcon>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-[11.5px] text-txt">
                      {profile.displayName}
                    </span>
                    <span className="truncate text-[10px] text-dim">
                      {profile.label}
                    </span>
                    <AgentInfoHint className="size-2.5" />
                  </span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-dim">
                    {item.task}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px]",
                    SPAWN_TONE[item.status],
                  )}
                >
                  {item.status === "selesai" && item.findings > 0
                    ? `${item.findings} temuan`
                    : SPAWN_LABEL[item.status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A compact group for agents that did not produce a finding. */
export function CoverageGroup({
  label,
  agents,
  defaultOpen = false,
  icon: Icon = CircleDashed,
  onSelectAgent,
}: {
  label: string;
  agents: readonly PanelAgent[];
  defaultOpen?: boolean;
  /** Heading glyph; each coverage bucket passes its own. */
  icon?: LucideIcon;
  onSelectAgent?: (agent: DetectorAgent) => void;
}): ReactNode {
  if (agents.length === 0) return null;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-[10px] border border-edge bg-panel px-3 py-2 text-left hover:border-brand-edge focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <span className="flex min-w-0 items-center gap-2">
          <PanelIcon icon={Icon} />
          <span className="min-w-0 truncate font-semibold text-[12.5px] text-ink">
            {label}
          </span>
          <span className="rounded bg-chip px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">
            {agents.length}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className="size-3.5 shrink-0 text-dim transition-transform duration-150 group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1.5 flex flex-col gap-1.5 ps-2">
          {agents.map((agent) => (
            <li
              className="rounded-[9px] border border-edge-soft bg-bg px-2.5 py-1.5"
              key={agent.agent}
            >
              <button
                aria-label={`Tampilkan info ${STAGE_LABEL[agent.agent].label}`}
                className="group/info flex w-full items-baseline justify-between gap-2 rounded-[6px] text-left outline-none transition-colors hover:bg-txt/[0.03] focus-visible:ring-2 focus-visible:ring-brand-strong"
                onClick={() => onSelectAgent?.(agent.agent)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[11px] text-txt">
                    {STAGE_LABEL[agent.agent].label}
                  </span>
                  <AgentInfoHint className="size-2.5" />
                </span>
                {agent.ms != null ? (
                  <span className="shrink-0 font-mono text-[10px] text-dim">
                    {formatMs(agent.ms)}
                  </span>
                ) : null}
              </button>
              <p className="mt-0.5 text-[10.5px] text-dim leading-snug">
                {agent.note ??
                  (agent.outcome === "pending"
                    ? "Belum ada catatan pipeline."
                    : "0 temuan")}
              </p>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The measured run, kept as a disclosure so the ledger stays scannable. */
export function TraceDisclosure({ trace }: { trace: AgentTrace }): ReactNode {
  const total = formatMs(trace.totalMs);

  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-[8px] px-1 py-1.5 text-left text-[10.5px] text-dim hover:bg-txt/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <span>
          Jejak {trace.stages.length} tahap · {total}
        </span>
        <ChevronDown
          aria-hidden
          className="size-3.5 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="mt-1 flex flex-col gap-1 border-edge-soft border-t pt-1.5">
          {trace.stages.map((stage) => (
            <li
              className="rounded-[8px] px-1 py-1 text-[10.5px] leading-snug"
              key={stage.id}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-txt">{stage.label}</span>
                <span className="shrink-0 font-mono text-[9.5px] text-dim">
                  {STAGE_STATUS_LABEL[stage.status] ?? stage.status} ·{" "}
                  {formatMs(stage.ms)}
                </span>
              </div>
              {stage.note ? (
                <p className="mt-0.5 text-dim">{stage.note}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
