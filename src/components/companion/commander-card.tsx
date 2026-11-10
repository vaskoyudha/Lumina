"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { ActivityOrb } from "@/components/companion/activity-orb";
import { SHIMMER_TEXT_CLASS } from "@/components/companion/thinking-row";
import { cn } from "@/lib/utils";

export type CommanderPhase =
  | "reading"
  | "recognising"
  | "preparing"
  | "delegating"
  | "done"
  | "stopped";

const STATUS: Record<CommanderPhase, string> = {
  reading: "Membaca pesan dan lampiran…",
  recognising: "Mengenali pola",
  preparing: "Menyiapkan agen",
  delegating: "Menjalankan agen",
  done: "Selesai",
  stopped: "Berhenti sebelum selesai",
};

function statusLabel(phase: CommanderPhase): string {
  if (phase === "done") {
    return "Selesai";
  }
  if (phase === "stopped") {
    return "Berhenti sebelum ringkasan";
  }
  return STATUS[phase];
}

export function CommanderCard({
  phase,
  announcement,
  source,
  startedAt,
}: {
  phase: CommanderPhase;
  announcement?: string;
  source?: "model" | "fallback";
  /** Epoch ms when the run left the client; null hides the counter. */
  startedAt?: number;
}) {
  const settled = phase === "done" || phase === "stopped";
  const waiting = !settled && phase !== "preparing";
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!waiting || startedAt === undefined) {
      setElapsed(0);
      return;
    }
    setElapsed(Date.now() - startedAt);
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(timer);
  }, [waiting, startedAt]);

  return (
    <div className="flex flex-col gap-1.5 motion-safe:animate-[trace-enter_220ms_ease-out]">
      <div className="rounded-lg border border-line bg-panel px-2.5 py-2">
        <div className="flex items-start gap-2">
          <Image
            src="/brand/agents/lumina.jpg"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full border border-line object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-[16px] text-txt">Lumina</span>
              <span className="nav-active-tint rounded-full px-2.5 py-0.5 font-bold text-[11.5px] text-nav-active-ink">
                Komandan
              </span>
            </div>
            {announcement ? (
              <p className="mt-1 font-serif text-[15px] text-txt leading-[1.7]">
                {announcement}
              </p>
            ) : null}
            {source === "fallback" ? (
              <p className="mt-1 text-[9.5px] text-dim">
                Pengantar disusun dari modus dasar, bukan model.
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <output className="flex min-h-8 items-center gap-2 px-1">
        {phase === "done" ? (
          <Check aria-hidden className="size-4 text-dim" />
        ) : settled ? null : (
          <ActivityOrb className="size-4" />
        )}
        <span
          className={cn(
            "font-semibold text-[15px] leading-5",
            settled ? "text-dim" : SHIMMER_TEXT_CLASS,
          )}
        >
          {statusLabel(phase)}
        </span>
        {waiting && startedAt !== undefined ? (
          <span className="tabular min-w-[3.5rem] text-[11px] text-dim">
            {(elapsed / 1000).toFixed(1)} detik
          </span>
        ) : null}
      </output>
    </div>
  );
}
