"use client";

import { Bot, CircleDot, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { AgentId, ScoreResult } from "@/lib/contracts/score";

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
    state: "planned",
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
}: {
  result: ScoreResult | null;
  sequence: AgentId[];
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
              findings={byAgent.get(agent) ?? 0}
              ran={scored || (byAgent.get(agent) ?? 0) > 0}
            />
          ))}
        </ul>

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
}: {
  agent: AgentId;
  findings: number;
  ran: boolean;
}) {
  const meta = AGENT_LABEL[agent];
  const planned = meta.state === "planned";

  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">
        {planned ? (
          <CircleDot aria-hidden className="size-3.5 text-dim/50" />
        ) : findings > 0 ? (
          <CircleDot aria-hidden className="size-3.5 text-warn" />
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
            <span className="tabular text-warn">{findings}</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[0.7rem] text-dim leading-snug">
          {meta.task}
        </p>
      </div>
    </li>
  );
}
