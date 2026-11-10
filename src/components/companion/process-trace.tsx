"use client";

import {
  Brain,
  Check,
  ChevronRight,
  CircleAlert,
  Workflow,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import {
  CommanderCard,
  type CommanderPhase,
} from "@/components/companion/commander-card";
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
  if (!runStart && !plan && blocks.length === 0) return null;

  const phase: CommanderPhase = synthesis
    ? "done"
    : !live
      ? "stopped"
      : plan
        ? "preparing"
        : commander
          ? "recognising"
          : "reading";

  const stepCount =
    (plan?.agents.length ?? 0) +
    blocks.reduce(
      (total, block) => total + block.thoughts.length + block.tools.length,
      0,
    );
  const subordinateCount = plan?.agents.length ?? blocks.length;

  return (
    <details open className={cn("group max-w-[92%] text-[12px]", className)}>
      <summary className="flex cursor-pointer select-none items-center gap-2 py-1 font-medium">
        <Workflow aria-hidden className="size-3.5" />
        Proses agen
        <span className="font-normal text-dim">{stepCount} langkah</span>
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
          agents={plan?.agents}
          source={commander?.source}
          startedAt={startedAt}
        />

        {plan || blocks.length > 0 ? (
          <section
            aria-label="Agen di bawah komando Lumina"
            className="ml-1.5 flex flex-col gap-2.5 border-line border-l pl-3"
          >
            <p className="text-[10px] font-medium tracking-wide text-dim uppercase">
              Sub-agen
              {subordinateCount > 0 ? ` · ${subordinateCount}` : ""}
            </p>

            {plan ? (
              <section
                aria-label="Rencana agen"
                className="rounded-lg border border-line bg-panel px-2.5 py-2"
              >
                <p className="text-[10.5px] font-medium tracking-wide text-dim uppercase">
                  Rencana agen
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {plan.agents.map((agent) => (
                    <span
                      key={agent.agent}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[10px] text-txt"
                    >
                      <span className="font-mono">
                        {AGENT_IDENTITIES[agent.agent].displayName}
                      </span>
                      <span className="text-dim">
                        {AGENT_IDENTITIES[agent.agent].field}
                      </span>
                    </span>
                  ))}
                </div>
                <details className="mt-1.5 rounded border border-line bg-panel-2 px-2 py-1">
                  <summary className="cursor-pointer select-none text-[10.5px] text-dim">
                    Alasan rencana
                  </summary>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-txt">
                    {plan.rationale}
                  </p>
                </details>
              </section>
            ) : null}

            {blocks.length > 0 ? (
              <ol className="flex flex-col gap-2.5">
                {blocks.map((block) => (
                  <li
                    key={block.start.agent}
                    className="rounded-lg border border-line bg-panel px-2.5 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <Image
                        src={AGENT_IDENTITIES[block.start.agent].portrait}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 shrink-0 rounded-full border border-line object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-txt">
                            {AGENT_IDENTITIES[block.start.agent].displayName}
                          </span>
                          <span className="text-[10.5px] text-dim">
                            {AGENT_IDENTITIES[block.start.agent].field}
                          </span>
                          <span
                            className={cn(
                              "ml-auto rounded-full px-1.5 py-0.5 text-[10px]",
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
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-dim">
                            {block.start.agent}
                          </span>
                          <span className="text-[10px] text-dim">
                            {block.start.label}
                          </span>
                        </div>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-dim">
                          {AGENT_IDENTITIES[block.start.agent].purpose}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-dim">
                          {block.start.task}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {block.start.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded border border-line px-1.5 py-0.5 font-mono text-[9.5px] text-dim"
                        >
                          skill:{skill}
                        </span>
                      ))}
                      {block.start.tools.map((tool) => (
                        <span
                          key={tool}
                          className="rounded border border-line px-1.5 py-0.5 font-mono text-[9.5px] text-dim"
                        >
                          tool:{tool}
                        </span>
                      ))}
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
                              className="leading-relaxed text-dim italic"
                            >
                              {thought.text}
                            </p>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    {block.tools.map((call) => {
                      const result = block.results.find(
                        (item) => item.callId === call.callId,
                      );
                      return (
                        <details
                          key={call.callId}
                          className="mt-1.5 rounded border border-line bg-panel-2 px-2 py-1"
                        >
                          <summary className="flex cursor-pointer select-none items-center gap-1.5">
                            <Wrench aria-hidden className="size-3" />
                            <span className="font-mono text-[10.5px]">
                              {call.tool}
                            </span>
                            {result ? (
                              <span
                                className={cn(
                                  "ml-auto text-[10px]",
                                  result.ok ? "text-dim" : "text-danger",
                                )}
                              >
                                {result.ok ? "ok" : "gagal"} · {result.ms} ms
                              </span>
                            ) : null}
                          </summary>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-dim">
                            {result?.output ||
                              JSON.stringify(call.args, null, 2)}
                          </pre>
                        </details>
                      );
                    })}

                    {block.end?.summary ? (
                      <p className="mt-1.5 leading-relaxed text-txt">
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
                              <p className="font-medium text-[11px] text-txt">
                                {point.point}
                              </p>
                              <p className="mt-0.5 text-[10.5px] leading-relaxed text-dim">
                                <span className="font-medium text-txt/80">
                                  Alasan:{" "}
                                </span>
                                {point.reason}
                              </p>
                              <span className="mt-1 inline-block rounded-full border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[9.5px] text-brand-ink">
                                {point.pattern}
                              </span>
                              <p className="mt-1 text-[10.5px] leading-relaxed text-warn">
                                <span className="font-medium">
                                  Perhatikan:{" "}
                                </span>
                                {point.watchout}
                              </p>
                              {point.quote ? (
                                <p className="mt-0.5 text-[10px] text-dim">
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
                      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-[11px] text-txt/80">
                        {block.end.findings.map((finding) => (
                          <li key={finding}>{finding}</li>
                        ))}
                      </ul>
                    ) : null}
                    {block.end?.status === "gagal" ? (
                      <p className="mt-1 flex items-center gap-1 text-[10.5px] text-danger">
                        <CircleAlert aria-hidden className="size-3" /> Agen
                        gagal; hasil ini tidak dipakai sebagai bukti.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ) : null}
      </div>
    </details>
  );
}
