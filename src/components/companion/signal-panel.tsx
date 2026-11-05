"use client";

import { Bot, CircleDot, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { EvidenceBundle } from "@/lib/contracts/evidence";
import type { AgentId, ScoreResult } from "@/lib/contracts/score";
import { cn } from "@/lib/utils";

/**
 * Right-hand evidence panel (§3). This panel is what makes Lumina read as an
 * agent system rather than a chatbot: the judge watches detectors report, it
 * does not just read a reply.
 *
 * Honesty rule (§5 · A): an agent that is not built returns nothing. It must
 * never show a fabricated finding. Unbuilt agents are labelled as such.
 */

const AGENT_LABEL: Record<
  AgentId,
  { name: string; task: string; state: "live" | "planned" }
> = {
  message: {
    name: "Message Agent",
    task: "Urgensi palsu, otoritas, iming-iming, permintaan OTP",
    state: "live",
  },
  link: {
    name: "Link Agent",
    task: "Domain mirip merek resmi, tautan pendek, ekstensi berisiko",
    state: "live",
  },
  identity: {
    name: "Identity Agent",
    task: "Nomor pengirim, SPF/DKIM/DMARC",
    state: "planned",
  },
  conversation: {
    name: "Conversation Agent",
    task: "Tanda bahaya yang menumpuk, tahap eskalasi",
    state: "planned",
  },
  evidence: {
    name: "Evidence Agent",
    task: "Menyusun EvidenceBundle untuk laporan",
    state: "live",
  },
  scoring: {
    name: "Scoring Orchestrator",
    task: "Menggabungkan temuan jadi 0–100",
    state: "live",
  },
};

export function SignalPanel({
  result,
  sequence,
  evidence,
}: {
  result: ScoreResult | null;
  sequence: AgentId[];
  /** What the Evidence Agent assembled, when this surface has produced one. */
  evidence?: EvidenceBundle | null;
}) {
  if (!result) {
    return (
      <Card className="gap-0 border border-line bg-panel py-0">
        <CardHeader className="py-4">
          <CardTitle className="font-medium text-sm text-txt">
            Panel bukti
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <Empty className="border-none p-0">
            <EmptyTitle className="text-sm">
              Belum ada yang diperiksa
            </EmptyTitle>
            <EmptyDescription className="text-dim text-xs">
              Setiap agent yang menemukan sesuatu menuliskan buktinya di sini,
              lengkap dengan kutipan dari pesanmu.
            </EmptyDescription>
          </Empty>

          <ul className="mt-5 flex flex-col gap-2.5">
            {sequence.map((agent) => (
              <AgentRow key={agent} agent={agent} findings={0} ran={false} />
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  const byAgent = new Map<AgentId, number>();
  for (const signal of result.signals) {
    const agent = signal.agent ?? "scoring";
    byAgent.set(agent, (byAgent.get(agent) ?? 0) + 1);
  }
  const scored = result.signals.some(
    (signal) => (signal.agent ?? "scoring") in AGENT_LABEL,
  );
  const artifacts = evidence?.artifacts ?? [];

  return (
    <Card className="gap-0 border border-line bg-panel py-0 lg:sticky lg:top-20">
      <CardHeader className="py-4">
        <CardTitle className="flex items-center justify-between font-medium text-sm text-txt">
          <span>Panel bukti</span>
          <Badge variant="secondary" className="tabular text-xs">
            {result.signals.length} temuan
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <ul className="flex flex-col gap-2.5">
          {sequence.map((agent) => (
            <AgentRow
              key={agent}
              agent={agent}
              findings={
                agent === "evidence"
                  ? artifacts.length
                  : (byAgent.get(agent) ?? 0)
              }
              ran={scored || (byAgent.get(agent) ?? 0) > 0}
              neutral={agent === "evidence"}
            />
          ))}
        </ul>

        {artifacts.length > 0 ? (
          <div className="mt-5 border-line border-t pt-4">
            <p className="font-medium text-txt text-xs">Bukti tercatat</p>
            <ul className="mt-2 flex flex-col gap-2">
              {artifacts.slice(0, 3).map((artifact) => (
                <li key={artifact.id} className="leading-snug">
                  <span className="block text-[0.7rem] text-dim">
                    {artifact.label}
                  </span>
                  <span className="block break-all text-[0.72rem] text-txt">
                    {artifact.value}
                  </span>
                </li>
              ))}
            </ul>
            {artifacts.length > 3 ? (
              <p className="mt-1.5 text-[0.7rem] text-dim">
                +{artifacts.length - 3} bukti lain di laporan
              </p>
            ) : null}
          </div>
        ) : null}

        <dl className="mt-5 flex flex-col gap-2 border-line border-t pt-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-dim">Skor akhir</dt>
            <dd className="tabular font-medium text-txt">{result.score}/100</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-dim">Modus</dt>
            <dd className="text-right text-txt">{result.modus}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-dim">Ditentukan oleh</dt>
            <dd className="text-txt">scoring.ts (deterministik)</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function AgentRow({
  agent,
  findings,
  ran,
  neutral = false,
}: {
  agent: AgentId;
  findings: number;
  ran: boolean;
  /**
   * A tally that is not a warning: artifacts collected, not risk findings.
   * Same number, different meaning, so it must not inherit the warn colour.
   */
  neutral?: boolean;
}) {
  const meta = AGENT_LABEL[agent];
  const planned = meta.state === "planned";

  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">
        {planned ? (
          <CircleDot aria-hidden className="size-3.5 text-dim/50" />
        ) : findings > 0 ? (
          <CircleDot
            aria-hidden
            className={cn("size-3.5", neutral ? "text-dim" : "text-warn")}
          />
        ) : ran ? (
          <ShieldCheck aria-hidden className="size-3.5 text-safe" />
        ) : (
          <Loader2
            aria-hidden
            className="size-3.5 text-dim animate-[spin_2s_linear_infinite]"
          />
        )}
      </span>

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium text-txt text-xs">
          <Bot aria-hidden className="size-3" />
          {meta.name}
          {planned ? (
            <Badge variant="outline" className="text-[0.65rem] text-dim">
              belum aktif
            </Badge>
          ) : findings > 0 ? (
            <span className={cn("tabular", neutral ? "text-dim" : "text-warn")}>
              {findings}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[0.7rem] text-dim leading-snug">
          {meta.task}
        </p>
      </div>
    </li>
  );
}
