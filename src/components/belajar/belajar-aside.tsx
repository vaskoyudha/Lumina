"use client";

import { ArrowRight, CircleDashed } from "lucide-react";
import Link from "next/link";
import {
  ProgressRing,
  useStoredProgress,
} from "@/components/belajar/belajar-progress";
import { Card } from "@/components/ui/card";
import { isPublished } from "@/data/kurikulum";
import { MODUS } from "@/lib/modus";

/**
 * Right rail of the catalog. Same honest data as the header — per-device
 * progress from `lib/progress.ts`, module totals from `modus.json`. No streak,
 * no XP, no chart of activity this app cannot measure.
 *
 * It renders a stable skeleton until mount, so the server HTML never claims
 * "0 selesai" and hydration never swaps a different number in.
 */

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
      <div className="p-5">
        <h2 className="font-medium text-sm text-txt">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </Card>
  );
}

export function BelajarAside() {
  const progress = useStoredProgress();
  const total = MODUS.length;

  const done = progress?.completedModules.length ?? 0;
  const pct = Math.min(100, Math.round((done / total) * 100));

  /**
   * "Lanjutkan" only points at a module that is actually written and not yet
   * finished. Suggesting a "segera" module would be a dead end dressed as a
   * next step.
   */
  const next = MODUS.filter(
    (m) =>
      isPublished(m.no) && !(progress?.completedModules ?? []).includes(m.no),
  ).sort((a, b) => a.no - b.no)[0];

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Progresmu">
        {progress ? (
          <div className="flex items-center gap-4">
            <ProgressRing pct={pct} size={64} />
            <div className="min-w-0">
              <p className="tabular font-medium text-txt">
                {done} dari {total} modul
              </p>
              <p className="appnext-caption">Tersimpan di perangkat ini.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4" aria-hidden>
            <CircleDashed className="size-16 animate-pulse text-line" />
            <div className="flex flex-col gap-2">
              <span className="h-4 w-28 rounded-full bg-panel-2" />
              <span className="h-3 w-36 rounded-full bg-panel-2" />
            </div>
          </div>
        )}
      </Panel>

      {next ? (
        <Panel title="Lanjutkan">
          <Link
            href={`/belajar/${next.no}`}
            data-pressable
            className="group flex items-start justify-between gap-3 rounded-2xl bg-panel-2 p-3 transition-colors duration-150 ease-out hover:bg-[var(--appnext-accent-wash)]"
          >
            <span className="min-w-0">
              <span className="appnext-caption tabular block">
                Modul {String(next.no).padStart(2, "0")}
              </span>
              <span className="mt-0.5 block font-medium text-sm text-txt leading-snug">
                {next.nama}
              </span>
            </span>
            <ArrowRight
              aria-hidden
              className="mt-1 size-4 shrink-0 text-dim transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            />
          </Link>
        </Panel>
      ) : (
        <Panel title="Semua selesai">
          <p className="text-dim text-sm">
            Setiap modul yang sudah ditulis beres di perangkat ini. Modul baru
            akan muncul di katalog saat lengkap.
          </p>
        </Panel>
      )}
    </div>
  );
}
