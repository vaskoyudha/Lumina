"use client";

import {
  ArrowLeft,
  Fingerprint,
  Link2,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  Quote,
  ShieldCheck,
} from "lucide-react";
import {
  AGENT_SEQUENCE,
  type DetectorAgent,
} from "@/components/companion/agents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";

/**
 * Agents — the detector overview shown in the center column.
 *
 * Static by design. The right-hand evidence panel is the live surface: it
 * prints what actually ran, in order, with measured durations. This view
 * answers the earlier question — who checks a message, and what does each one
 * look for? — from the canonical sequence and labels, so it can never drift
 * from the panel that reports the run.
 */

/** One icon per detector family, matching the evidence panel's rows. */
const AGENT_ICON: Record<DetectorAgent, LucideIcon> = {
  message: MessageSquare,
  link: Link2,
  identity: Fingerprint,
  conversation: MessagesSquare,
  evidence: Quote,
};

export function AgentsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 sm:px-6">
      <div className="mx-auto w-full max-w-[820px] pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 h-8 gap-1.5 rounded-full px-2.5 text-[12px] text-ink-soft hover:bg-chip hover:text-ink"
        >
          <ArrowLeft aria-hidden strokeWidth={1.8} className="size-3.5" />
          Kembali ke percakapan
        </Button>

        <h1
          id="agen-pemeriksa-title"
          className="mt-3 font-semibold text-[22px] text-ink leading-[1.2] tracking-[-0.02em]"
        >
          Agen pemeriksa
        </h1>
        <p className="mt-1.5 max-w-[560px] text-[12.5px] text-ink-soft leading-relaxed">
          Lima agen membaca pesan yang sama dengan cara berbeda. Mereka hanya
          melaporkan temuan; skor tetap dihitung satu engine deterministik.
        </p>

        <ul className="mt-5 grid list-none gap-2.5 sm:grid-cols-2">
          {AGENT_SEQUENCE.map((agent, index) => {
            const { label, task } = STAGE_LABEL[agent];
            const Icon = AGENT_ICON[agent];
            return (
              <li
                key={agent}
                className={
                  index === AGENT_SEQUENCE.length - 1 ? "sm:col-span-2" : ""
                }
              >
                <Card
                  data-agent={agent}
                  className="h-full gap-0 rounded-[10px] border border-edge bg-panel py-0 shadow-rest ring-0"
                >
                  <CardHeader className="flex flex-row items-center gap-2.5 px-3.5 pt-3 pb-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-brand-soft text-brand-ink">
                      <Icon
                        aria-hidden
                        strokeWidth={1.8}
                        className="size-3.5"
                      />
                    </span>
                    <CardTitle className="font-semibold text-[12.5px] text-ink leading-snug">
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3.5 pt-1.5 pb-3 text-[11.5px] text-ink-soft leading-relaxed">
                    {task}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 flex items-start gap-2 rounded-[9px] border border-hairline bg-panel-2 px-3 py-2.5 text-[11.5px] text-ink-mute leading-relaxed">
          <ShieldCheck
            aria-hidden
            strokeWidth={1.8}
            className="mt-px size-4 shrink-0 text-brand"
          />
          Pesan yang diperiksa tidak pernah meninggalkan perangkat. Agen
          berjalan lokal; model bahasa hanya menyusun kalimat dari temuan.
        </p>
      </div>
    </div>
  );
}
