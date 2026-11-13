"use client";

import {
  Brain,
  Check,
  ChevronRight,
  CircleAlert,
  EyeOff,
  Gauge,
  Globe,
  Link2,
  ScanSearch,
  Tags,
  Workflow,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { ActivityOrb } from "@/components/companion/activity-orb";
import {
  AgentInfoHint,
  AgentInfoPopover,
} from "@/components/companion/agent-info-popover";
import {
  CommanderCard,
  type CommanderPhase,
} from "@/components/companion/commander-card";
import { StatusPulse } from "@/components/companion/status-pulse";
import { SHIMMER_TEXT_CLASS } from "@/components/companion/thinking-row";
import { AGENT_IDENTITIES } from "@/lib/agents/identities";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";
import { cn } from "@/lib/utils";

interface AgentBlock {
  start: Extract<OrchestratorEvent, { type: "agent_start" }>;
  thoughts: Extract<OrchestratorEvent, { type: "thought" }>[];
  tools: Extract<OrchestratorEvent, { type: "tool_call" }>[];
  results: Extract<OrchestratorEvent, { type: "tool_result" }>[];
  end: Extract<OrchestratorEvent, { type: "agent_result" }> | null;
}

function groupAgents(events: OrchestratorEvent[]): AgentBlock[] {
  const blocks: AgentBlock[] = [];
  const byAgent = new Map<string, AgentBlock>();
  for (const event of events) {
    if (event.type === "agent_start") {
      const block: AgentBlock = {
        start: event,
        thoughts: [],
        tools: [],
        results: [],
        end: null,
      };
      blocks.push(block);
      byAgent.set(event.agent, block);
      continue;
    }
    if (!("agent" in event)) continue;
    const block = byAgent.get(event.agent);
    if (!block) continue;
    if (event.type === "thought") block.thoughts.push(event);
    if (event.type === "tool_call") block.tools.push(event);
    if (event.type === "tool_result") block.results.push(event);
    if (event.type === "agent_result") block.end = event;
  }
  return blocks;
}

/** One glyph per orchestrator tool; an unknown tool still reads as a tool. */
const TOOL_ICONS: Record<string, typeof Wrench> = {
  score_message: Gauge,
  scan_detector: ScanSearch,
  extract_links: Link2,
  verify_link: Globe,
  domain_lookup: Globe,
  extract_entities: Tags,
  scrub_secrets: EyeOff,
};

/**
 * The tool calls of one agent as a single collapsed process, the same shape as
 * the thinking block: default closed, expand to read what each call returned.
 * The label is built from the calls that actually happened, never from the
 * planner's declared tool list, so it cannot claim a call that did not run.
 */
function ToolProcess({
  calls,
  results,
  live,
}: {
  calls: AgentBlock["tools"];
  results: AgentBlock["results"];
  live: boolean;
}): React.ReactNode {
  if (calls.length === 0) return null;

  const names = [...new Set(calls.map((call) => call.tool))];
  const pending = calls.some(
    (call) => !results.some((result) => result.callId === call.callId),
  );
  const okCount = results.filter((result) => result.ok).length;

  return (
    <details className="group/tools mt-1.5">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 text-[10.5px] text-dim">
        <span className="relative flex size-3 shrink-0 items-center justify-center">
          <Wrench aria-hidden className="size-3" />
          {live && pending ? (
            <StatusPulse
              className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-brand-strong"
              kind="opacity"
            />
          ) : null}
        </span>
        <span className="min-w-0 truncate font-mono text-[10px]">
          Proses tool · {names.join(", ")}
        </span>
        <ChevronRight
          aria-hidden
          className="size-3 shrink-0 transition-transform group-open/tools:rotate-90"
        />
        <span className="ml-auto shrink-0 text-[9.5px] tabular-nums">
          {calls.length} panggilan{results.length > 0 ? ` · ${okCount} ok` : ""}
        </span>
      </summary>
      <div className="mt-1 flex flex-col gap-1.5 border-brand-edge border-l-2 pl-2">
        {calls.map((call) => {
          const result = results.find((item) => item.callId === call.callId);
          const Icon = TOOL_ICONS[call.tool] ?? Wrench;

          return (
            <div key={call.callId} className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Icon
                  aria-hidden
                  className="size-3 shrink-0 text-brand-strong"
                />
                <span className="font-mono text-[10.5px] text-txt">
                  {call.tool}
                </span>
                {result ? (
                  <span
                    className={cn(
                      "ml-auto text-[9.5px] tabular-nums",
                      result.ok ? "text-dim" : "text-danger",
                    )}
                  >
                    {result.ok ? "ok" : "gagal"} · {result.ms} ms
                  </span>
                ) : (
                  <span className="ml-auto text-[9.5px] text-dim">
                    berjalan
                  </span>
                )}
              </div>
              <pre className="mt-0.5 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[9.5px] leading-relaxed text-dim">
                {result?.output || JSON.stringify(call.args, null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function ProcessTrace({
  events,
  className,
  live = true,
  startedAt,
}: {
  events: OrchestratorEvent[];
  className?: string;
  live?: boolean;
  /** Epoch ms when the run left the client, for the commander's live counter. */
  startedAt?: number;
}) {
  const plan = events.find(
    (event): event is Extract<OrchestratorEvent, { type: "plan" }> =>
      event.type === "plan",
  );
  const synthesis = events.find(
    (event): event is Extract<OrchestratorEvent, { type: "synthesis_end" }> =>
      event.type === "synthesis_end",
  );
  const blocks = React.useMemo(() => groupAgents(events), [events]);
  const runStart = events.find((event) => event.type === "run_start");
  const commander = events.find(
    (event): event is Extract<OrchestratorEvent, { type: "commander_say" }> =>
      event.type === "commander_say",
  );
  const consensus = events.find(
    (event): event is Extract<OrchestratorEvent, { type: "consensus" }> =>
      event.type === "consensus",
  );
  const decision = events.find(
    (event): event is Extract<OrchestratorEvent, { type: "score_decision" }> =>
      event.type === "score_decision",
  );
  if (!runStart && !plan && blocks.length === 0) return null;

  const phase: CommanderPhase = synthesis
    ? "done"
    : !live
      ? "stopped"
      : plan
        ? blocks.length > 0
          ? "delegating"
          : "preparing"
        : commander
          ? "recognising"
          : "reading";

  const visibleBlocks = blocks.filter(
    (block) => block.end?.status !== "dilewati",
  );
  const stepCount = visibleBlocks.reduce(
    (total, block) => total + 1 + block.thoughts.length + block.tools.length,
    0,
  );

  return (
    <details
      open
      className={cn(
        "group max-w-[92%] text-[12px] motion-safe:animate-[trace-enter_220ms_ease-out]",
        className,
      )}
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 py-1 font-medium">
        <Workflow aria-hidden className="size-3.5" />
        <span
          className={cn(
            "font-semibold text-[15px] leading-5",
            live && !synthesis ? SHIMMER_TEXT_CLASS : "text-txt",
          )}
        >
          Proses agen
        </span>
        {stepCount > 0 ? (
          <span className="tabular font-normal text-[11px] text-dim">
            {stepCount} langkah
          </span>
        ) : null}
        {synthesis ? (
          <span className="ml-auto flex items-center gap-1 font-normal text-[10.5px] text-dim">
            <Check aria-hidden className="size-3" /> selesai
          </span>
        ) : null}
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3.5 text-dim transition-transform",
            synthesis ? "" : "ml-auto",
            "group-open:rotate-90",
          )}
        />
      </summary>

      <div className="mt-2 flex flex-col gap-2.5">
        <CommanderCard
          phase={phase}
          announcement={commander?.text}
          source={commander?.source}
          startedAt={startedAt}
        />

        {consensus?.groups[0] || decision ? (
          <section
            aria-label="Konsensus agen"
            className="ml-1.5 flex flex-col gap-1 border-line border-l pl-3"
          >
            {consensus?.groups[0] ? (
              <p className="text-dim text-[11px]">
                {consensus.groups[0].agents.length} agen sepakat ·{" "}
                {consensus.groups[0].pattern}
              </p>
            ) : null}
            {decision ? (
              <p className="text-txt text-[11px]">
                Skor akhir {decision.result.score}/100 ·{" "}
                {decision.source === "model"
                  ? "dinilai Lumina"
                  : "skor engine dipertahankan"}
              </p>
            ) : null}
          </section>
        ) : null}

        {plan || blocks.length > 0 ? (
          <section
            aria-label="Agen di bawah komando Lumina"
            className="flex flex-col gap-2.5"
          >
            {visibleBlocks.length > 0 ? (
              <p className="text-[10px] font-medium tracking-wide text-dim uppercase">
                Agen dipanggil · {visibleBlocks.length}
              </p>
            ) : (
              <p className="text-[11px] text-dim">
                {blocks.length > 0
                  ? "Tidak ada agen yang sempat melapor."
                  : "Menyiapkan agen…"}
              </p>
            )}

            {visibleBlocks.length > 0 ? (
              <ol className="flex flex-col gap-2.5">
                {visibleBlocks.map((block, index) => (
                  <li
                    key={block.start.agent}
                    style={{
                      animationDelay: `${Math.min(index, 6) * 45}ms`,
                    }}
                    className={cn(
                      "motion-safe:animate-[trace-enter_260ms_ease-out_both] flex flex-col rounded-[20px] border bg-panel px-3.5 py-3 shadow-panel",
                      block.end ? "border-line" : "border-brand-edge/60",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AgentInfoPopover
                        agent={block.start.agent}
                        className="flex min-w-0 flex-1 items-start gap-2"
                      >
                        <Image
                          src={AGENT_IDENTITIES[block.start.agent].portrait}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 shrink-0 rounded-full border border-line object-cover transition-colors group-hover/info:border-brand-edge"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            {!block.end ? (
                              <ActivityOrb className="size-3.5" />
                            ) : null}
                            <span className="font-semibold text-txt">
                              {AGENT_IDENTITIES[block.start.agent].displayName}
                            </span>
                            <span
                              data-agent-tone={block.start.agent}
                              className="agent-role-pill"
                            >
                              {AGENT_IDENTITIES[block.start.agent].field}
                            </span>
                            <AgentInfoHint />
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10.5px] text-dim">
                              {block.start.agent}
                            </span>
                            <span className="text-[10px] text-dim">
                              {block.start.label}
                            </span>
                          </span>
                        </span>
                      </AgentInfoPopover>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px]",
                          block.end?.status === "selesai"
                            ? "bg-brand-soft text-brand-ink"
                            : block.end?.status === "gagal"
                              ? "bg-danger/10 text-danger"
                              : "bg-panel-2 text-dim",
                        )}
                      >
                        {block.end?.status ?? "berjalan"}
                        {block.end ? ` · ${block.end.ms} ms` : ""}
                      </span>
                    </div>
                    {block.thoughts.length > 0 ? (
                      <details className="group/thought mt-1.5 rounded border border-line bg-panel-2 px-2 py-1">
                        <summary className="flex cursor-pointer select-none items-center gap-1.5 text-[10.5px] text-dim">
                          <Brain aria-hidden className="size-3" />
                          Pemikiran agen
                          <span className="font-mono text-[9.5px]">
                            {block.thoughts.length}
                          </span>
                          <ChevronRight
                            aria-hidden
                            className="ml-auto size-3 transition-transform group-open/thought:rotate-90"
                          />
                        </summary>
                        <div className="mt-1 flex flex-col gap-1 border-l-2 border-brand-edge pl-2">
                          {block.thoughts.map((thought, index) => (
                            <p
                              key={`${thought.seq}-${index}`}
                              className="font-serif text-[13.5px] text-dim leading-[1.7] italic"
                            >
                              {thought.text}
                            </p>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    <ToolProcess
                      calls={block.tools}
                      results={block.results}
                      live={!block.end}
                    />

                    {block.end?.summary ? (
                      <p className="mt-1.5 font-serif text-[15px] text-txt leading-[1.7]">
                        {block.end.summary}
                      </p>
                    ) : null}

                    {block.end && block.end.points.length > 0 ? (
                      <div className="mt-2 rounded border border-brand-edge/60 bg-brand-soft/30 px-2 py-1.5">
                        <p className="text-[10px] font-medium tracking-wide text-dim uppercase">
                          Poin temuan
                        </p>
                        <ul className="mt-1 flex flex-col gap-2">
                          {block.end.points.map((point, index) => (
                            <li
                              key={`${point.signal}-${index}`}
                              className="rounded bg-panel/70 px-2 py-1.5"
                            >
                              <p className="font-medium font-serif text-[14px] text-txt">
                                {point.point}
                              </p>
                              <p className="mt-0.5 font-serif text-[13px] text-dim leading-[1.7]">
                                <span className="font-medium text-txt/80">
                                  Alasan:{" "}
                                </span>
                                {point.reason}
                              </p>
                              <span className="mt-1 inline-block rounded-full border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[9.5px] text-brand-ink">
                                {point.pattern}
                              </span>
                              <p className="mt-1 font-serif text-[13px] text-warn leading-[1.7]">
                                <span className="font-medium">
                                  Perhatikan:{" "}
                                </span>
                                {point.watchout}
                              </p>
                              {point.quote ? (
                                <p className="mt-0.5 font-serif text-[12.5px] text-dim italic">
                                  Kutipan: “{point.quote}”
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {block.end &&
                    block.end.points.length === 0 &&
                    block.end.findings.length > 0 ? (
                      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 font-serif text-[13.5px] text-txt/80 leading-[1.7]">
                        {block.end.findings.map((finding) => (
                          <li key={finding}>{finding}</li>
                        ))}
                      </ul>
                    ) : null}
                    {block.end?.status === "gagal" ? (
                      <p className="mt-1 flex items-center gap-1 text-[13px] text-danger">
                        <CircleAlert aria-hidden className="size-3" /> Agen
                        gagal; hasil ini tidak dipakai sebagai bukti.
                      </p>
                    ) : null}

                    {block.start.skills.length > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-1 border-edge-soft border-t pt-2">
                        {block.start.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded border border-line px-1.5 py-0.5 font-mono text-[9.5px] text-dim"
                          >
                            skill:{skill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {plan ? (
              <details>
                <summary className="cursor-pointer select-none text-[10.5px] text-dim">
                  Alasan rencana
                </summary>
                <p className="mt-1 font-serif text-[14px] text-txt leading-[1.7]">
                  {plan.rationale}
                </p>
              </details>
            ) : null}
          </section>
        ) : null}
      </div>
    </details>
  );
}
