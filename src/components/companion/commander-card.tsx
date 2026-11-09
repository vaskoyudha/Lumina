"use client";

import { Check, Loader2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import * as React from "react";
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
  const reduce = useReducedMotion();
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
    <div className="rounded-[20px] border border-line bg-panel px-3.5 py-3 shadow-panel">
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
            <span className="font-semibold text-[12px] text-txt">Lumina</span>
            <span className="nav-active-tint rounded-full px-2.5 py-0.5 font-bold text-[11.5px] text-nav-active-ink">
              Komandan
            </span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-dim">
              {settled ? (
                <Check aria-hidden className="size-3" />
              ) : (
                <Loader2
                  aria-hidden
                  className={cn(
                    "size-3",
                    reduce ? "" : "animate-spin motion-reduce:animate-none",
                  )}
                />
              )}
              {STATUS[phase]}
              {waiting && startedAt !== undefined ? (
                <span className="tabular">
                  · {(elapsed / 1000).toFixed(1)} detik
                </span>
              ) : null}
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
  );
}
